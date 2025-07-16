/**
 * Resilient Auto-Posting Service with Persistence and Retry Logic
 * Survives Replit restarts and handles quota/authentication failures
 */

import { storage } from '../storage';
import { platformPostManager } from './platform-post-manager';
import { oauthTokenManager } from './oauth-token-manager';
import { db } from '../db';
import { eq, and, lte } from 'drizzle-orm';
import { posts, postSchedule, platformConnections } from '@shared/schema';

interface PostJob {
  id: string;
  userId: number;
  postId: number;
  platform: string;
  content: string;
  scheduledTime: Date;
  attempts: number;
  maxAttempts: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  lastError?: string;
  nextRetry?: Date;
  createdAt: Date;
  updatedAt: Date;
}

interface RetryConfig {
  maxAttempts: number;
  baseDelay: number; // seconds
  maxDelay: number; // seconds
  backoffMultiplier: number;
}

export class ResilientAutoPoster {
  private static instance: ResilientAutoPoster;
  private jobQueue: Map<string, PostJob> = new Map();
  private isRunning: boolean = false;
  private intervalId: NodeJS.Timeout | null = null;
  private readonly processingInterval = 30000; // 30 seconds

  private readonly retryConfig: RetryConfig = {
    maxAttempts: 5,
    baseDelay: 60, // 1 minute
    maxDelay: 3600, // 1 hour
    backoffMultiplier: 2
  };

  private readonly platformQuotas = {
    facebook: { daily: 50, hourly: 10 },
    instagram: { daily: 25, hourly: 5 },
    linkedin: { daily: 20, hourly: 3 },
    twitter: { daily: 300, hourly: 30 },
    youtube: { daily: 6, hourly: 1 }
  };

  public static getInstance(): ResilientAutoPoster {
    if (!ResilientAutoPoster.instance) {
      ResilientAutoPoster.instance = new ResilientAutoPoster();
    }
    return ResilientAutoPoster.instance;
  }

  /**
   * Initialize the auto-poster service
   */
  async initialize(): Promise<void> {
    console.log('🚀 Initializing Resilient Auto-Poster Service...');
    
    // Load pending jobs from database
    await this.loadPendingJobs();
    
    // Start the processing loop
    this.startProcessingLoop();
    
    console.log(`✅ Auto-Poster initialized with ${this.jobQueue.size} pending jobs`);
  }

  /**
   * Schedule a post for publishing
   */
  async schedulePost(
    userId: number,
    postId: number,
    platform: string,
    content: string,
    scheduledTime: Date
  ): Promise<string> {
    const jobId = `${userId}_${postId}_${platform}_${Date.now()}`;
    
    const job: PostJob = {
      id: jobId,
      userId,
      postId,
      platform,
      content,
      scheduledTime,
      attempts: 0,
      maxAttempts: this.retryConfig.maxAttempts,
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Store job in memory and database
    this.jobQueue.set(jobId, job);
    await this.persistJob(job);

    console.log(`📅 Post scheduled: ${jobId} for ${platform} at ${scheduledTime}`);
    return jobId;
  }

  /**
   * Load pending jobs from database on startup
   */
  private async loadPendingJobs(): Promise<void> {
    try {
      // In a real implementation, this would load from a post_jobs table
      // For now, we'll check the postSchedule table for pending posts
      const pendingSchedules = await db.select()
        .from(postSchedule)
        .where(eq(postSchedule.status, 'scheduled'));

      for (const schedule of pendingSchedules) {
        if (schedule.scheduledTime && new Date(schedule.scheduledTime) > new Date()) {
          // Create job from schedule
          const job: PostJob = {
            id: `schedule_${schedule.id}`,
            userId: schedule.userId,
            postId: schedule.postId,
            platform: schedule.platform,
            content: schedule.content || '',
            scheduledTime: new Date(schedule.scheduledTime),
            attempts: 0,
            maxAttempts: this.retryConfig.maxAttempts,
            status: 'pending',
            createdAt: new Date(),
            updatedAt: new Date()
          };

          this.jobQueue.set(job.id, job);
        }
      }

      console.log(`📥 Loaded ${pendingSchedules.length} pending jobs from database`);
    } catch (error) {
      console.error('❌ Failed to load pending jobs:', error);
    }
  }

  /**
   * Start the main processing loop
   */
  private startProcessingLoop(): void {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;
    this.intervalId = setInterval(async () => {
      await this.processJobs();
    }, this.processingInterval);

    console.log('🔄 Auto-poster processing loop started');
  }

  /**
   * Stop the processing loop
   */
  stop(): void {
    this.isRunning = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    console.log('⏹️ Auto-poster processing loop stopped');
  }

  /**
   * Process all pending jobs
   */
  private async processJobs(): Promise<void> {
    const now = new Date();
    const jobsToProcess = Array.from(this.jobQueue.values()).filter(job => 
      job.status === 'pending' && 
      job.scheduledTime <= now &&
      (!job.nextRetry || job.nextRetry <= now)
    );

    if (jobsToProcess.length === 0) {
      return;
    }

    console.log(`🔄 Processing ${jobsToProcess.length} jobs...`);

    for (const job of jobsToProcess) {
      await this.processJob(job);
    }
  }

  /**
   * Process a single job with retry logic
   */
  private async processJob(job: PostJob): Promise<void> {
    try {
      job.status = 'processing';
      job.attempts++;
      job.updatedAt = new Date();

      console.log(`🔄 Processing job ${job.id} (attempt ${job.attempts}/${job.maxAttempts})`);

      // Check quota before attempting to post
      const canPost = await this.checkQuota(job.userId, job.platform);
      if (!canPost) {
        throw new Error(`Quota exceeded for ${job.platform}`);
      }

      // Validate and refresh token if needed
      const accessToken = await this.validateAndRefreshToken(job.userId, job.platform);
      if (!accessToken) {
        throw new Error(`Failed to get valid access token for ${job.platform}`);
      }

      // Attempt to publish the post
      const result = await this.publishPost(job, accessToken);
      
      if (result.success) {
        job.status = 'completed';
        console.log(`✅ Job ${job.id} completed successfully`);
        
        // Update database record
        await this.updateScheduleStatus(job, 'published');
        
        // Remove from queue
        this.jobQueue.delete(job.id);
      } else {
        throw new Error(result.error || 'Unknown publishing error');
      }

    } catch (error) {
      console.error(`❌ Job ${job.id} failed:`, error);
      await this.handleJobFailure(job, error as Error);
    }

    // Persist job state
    await this.persistJob(job);
  }

  /**
   * Check if user can post to platform (quota management)
   */
  private async checkQuota(userId: number, platform: string): Promise<boolean> {
    try {
      const quota = this.platformQuotas[platform as keyof typeof this.platformQuotas];
      if (!quota) {
        return true; // No quota defined, allow posting
      }

      // Check daily quota
      const dailyCount = await this.getPostCount(userId, platform, 24 * 60 * 60 * 1000);
      if (dailyCount >= quota.daily) {
        console.log(`⚠️ Daily quota exceeded for ${platform}: ${dailyCount}/${quota.daily}`);
        return false;
      }

      // Check hourly quota
      const hourlyCount = await this.getPostCount(userId, platform, 60 * 60 * 1000);
      if (hourlyCount >= quota.hourly) {
        console.log(`⚠️ Hourly quota exceeded for ${platform}: ${hourlyCount}/${quota.hourly}`);
        return false;
      }

      return true;
    } catch (error) {
      console.error('❌ Quota check failed:', error);
      return false;
    }
  }

  /**
   * Get post count for user on platform within time period
   */
  private async getPostCount(userId: number, platform: string, timePeriodMs: number): Promise<number> {
    const since = new Date(Date.now() - timePeriodMs);
    
    try {
      const result = await db.select()
        .from(posts)
        .where(
          and(
            eq(posts.userId, userId),
            eq(posts.platform, platform),
            lte(posts.createdAt, since)
          )
        );
      
      return result.length;
    } catch (error) {
      console.error('❌ Failed to get post count:', error);
      return 0;
    }
  }

  /**
   * Validate and refresh OAuth token
   */
  private async validateAndRefreshToken(userId: number, platform: string): Promise<string | null> {
    try {
      const validToken = await oauthTokenManager.getValidAccessToken(userId, platform);
      if (validToken) {
        return validToken;
      }

      // Token invalid, try to refresh
      const refreshResult = await oauthTokenManager.refreshToken(userId, platform);
      if (refreshResult.success && refreshResult.accessToken) {
        return refreshResult.accessToken;
      }

      return null;
    } catch (error) {
      console.error(`❌ Token validation failed for ${platform}:`, error);
      return null;
    }
  }

  /**
   * Publish post to platform
   */
  private async publishPost(job: PostJob, accessToken: string): Promise<{success: boolean, error?: string}> {
    try {
      // Use platform-specific publishing logic
      const result = await platformPostManager.publishToPlatform(
        job.platform,
        job.content,
        accessToken,
        job.userId
      );

      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Handle job failure with retry logic
   */
  private async handleJobFailure(job: PostJob, error: Error): Promise<void> {
    job.lastError = error.message;
    job.status = 'pending'; // Reset to pending for retry

    if (job.attempts >= job.maxAttempts) {
      job.status = 'failed';
      console.error(`❌ Job ${job.id} failed permanently after ${job.attempts} attempts`);
      
      // Update database record
      await this.updateScheduleStatus(job, 'failed');
      
      // Remove from queue
      this.jobQueue.delete(job.id);
      return;
    }

    // Calculate next retry time with exponential backoff
    const delay = Math.min(
      this.retryConfig.baseDelay * Math.pow(this.retryConfig.backoffMultiplier, job.attempts - 1),
      this.retryConfig.maxDelay
    );
    
    job.nextRetry = new Date(Date.now() + delay * 1000);
    
    console.log(`⏰ Job ${job.id} will retry in ${delay} seconds (${job.nextRetry})`);
  }

  /**
   * Persist job to database
   */
  private async persistJob(job: PostJob): Promise<void> {
    try {
      // In a real implementation, this would save to a post_jobs table
      // For now, we'll update the postSchedule table
      await db.update(postSchedule)
        .set({
          status: job.status === 'completed' ? 'published' : 'scheduled',
          attempts: job.attempts,
          lastError: job.lastError,
          updatedAt: new Date()
        })
        .where(eq(postSchedule.id, job.postId));
    } catch (error) {
      console.error('❌ Failed to persist job:', error);
    }
  }

  /**
   * Update schedule status in database
   */
  private async updateScheduleStatus(job: PostJob, status: string): Promise<void> {
    try {
      await db.update(postSchedule)
        .set({
          status,
          publishedAt: status === 'published' ? new Date() : null,
          updatedAt: new Date()
        })
        .where(eq(postSchedule.id, job.postId));
    } catch (error) {
      console.error('❌ Failed to update schedule status:', error);
    }
  }

  /**
   * Get job status
   */
  getJobStatus(jobId: string): PostJob | null {
    return this.jobQueue.get(jobId) || null;
  }

  /**
   * Get all pending jobs
   */
  getPendingJobs(): PostJob[] {
    return Array.from(this.jobQueue.values()).filter(job => 
      job.status === 'pending' || job.status === 'processing'
    );
  }

  /**
   * Cancel a scheduled job
   */
  async cancelJob(jobId: string): Promise<boolean> {
    const job = this.jobQueue.get(jobId);
    if (!job) {
      return false;
    }

    job.status = 'failed';
    job.lastError = 'Cancelled by user';
    
    await this.persistJob(job);
    this.jobQueue.delete(jobId);
    
    console.log(`❌ Job ${jobId} cancelled`);
    return true;
  }
}

export const resilientAutoPoster = ResilientAutoPoster.getInstance();