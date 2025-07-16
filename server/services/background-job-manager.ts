/**
 * Background Job Manager for Persistent Auto-Posting
 * Handles job scheduling, execution, and persistence across Replit restarts
 */

import { Worker } from 'worker_threads';
import { resilientAutoPoster } from './resilient-auto-poster';
import { storage } from '../storage';
import { db } from '../db';
import { eq, and, lte } from 'drizzle-orm';
import { postSchedule } from '@shared/schema';

export class BackgroundJobManager {
  private static instance: BackgroundJobManager;
  private isInitialized = false;
  private scheduledJobs: Map<string, NodeJS.Timeout> = new Map();
  private jobWorkers: Map<string, Worker> = new Map();
  
  public static getInstance(): BackgroundJobManager {
    if (!BackgroundJobManager.instance) {
      BackgroundJobManager.instance = new BackgroundJobManager();
    }
    return BackgroundJobManager.instance;
  }

  /**
   * Initialize background job manager
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    console.log('🔧 Initializing Background Job Manager...');

    // Initialize the resilient auto-poster
    await resilientAutoPoster.initialize();

    // Set up graceful shutdown handlers
    this.setupShutdownHandlers();

    // Start the job scheduler
    this.startJobScheduler();

    // Process any immediate jobs
    await this.processImmediateJobs();

    this.isInitialized = true;
    console.log('✅ Background Job Manager initialized');
  }

  /**
   * Schedule a post with background processing
   */
  async schedulePost(
    userId: number,
    postId: number,
    platform: string,
    content: string,
    scheduledTime: Date
  ): Promise<string> {
    const jobId = await resilientAutoPoster.schedulePost(
      userId,
      postId,
      platform,
      content,
      scheduledTime
    );

    // Schedule a timeout for immediate execution if needed
    const delay = scheduledTime.getTime() - Date.now();
    if (delay > 0 && delay < 24 * 60 * 60 * 1000) { // Within 24 hours
      const timeoutId = setTimeout(async () => {
        await this.executeJob(jobId);
        this.scheduledJobs.delete(jobId);
      }, delay);

      this.scheduledJobs.set(jobId, timeoutId);
    }

    return jobId;
  }

  /**
   * Execute a job immediately
   */
  private async executeJob(jobId: string): Promise<void> {
    try {
      const job = resilientAutoPoster.getJobStatus(jobId);
      if (!job) {
        console.error(`❌ Job ${jobId} not found`);
        return;
      }

      console.log(`🏃 Executing job ${jobId} immediately`);
      
      // The resilient auto-poster will handle the actual execution
      // We just need to ensure it's processed in the next cycle
      
    } catch (error) {
      console.error(`❌ Failed to execute job ${jobId}:`, error);
    }
  }

  /**
   * Start the job scheduler that runs every minute
   */
  private startJobScheduler(): void {
    // Run every minute to check for jobs
    setInterval(async () => {
      await this.checkAndScheduleJobs();
    }, 60000); // 1 minute

    console.log('⏰ Job scheduler started (1-minute intervals)');
  }

  /**
   * Check database for new jobs and schedule them
   */
  private async checkAndScheduleJobs(): Promise<void> {
    try {
      // Get all scheduled posts that haven't been processed
      const scheduledPosts = await db.select()
        .from(postSchedule)
        .where(eq(postSchedule.status, 'scheduled'));

      for (const post of scheduledPosts) {
        const jobId = `schedule_${post.id}`;
        
        // Check if job is already scheduled
        if (this.scheduledJobs.has(jobId)) {
          continue;
        }

        if (post.scheduledTime) {
          const scheduledTime = new Date(post.scheduledTime);
          const now = new Date();
          
          // If it's time to post (within next 5 minutes)
          if (scheduledTime <= new Date(now.getTime() + 5 * 60 * 1000)) {
            await this.schedulePost(
              post.userId,
              post.postId,
              post.platform,
              post.content || '',
              scheduledTime
            );
          }
        }
      }
    } catch (error) {
      console.error('❌ Failed to check and schedule jobs:', error);
    }
  }

  /**
   * Process jobs that should be executed immediately
   */
  private async processImmediateJobs(): Promise<void> {
    try {
      const now = new Date();
      const immediateJobs = await db.select()
        .from(postSchedule)
        .where(
          and(
            eq(postSchedule.status, 'scheduled'),
            lte(postSchedule.scheduledTime, now)
          )
        );

      for (const job of immediateJobs) {
        await this.schedulePost(
          job.userId,
          job.postId,
          job.platform,
          job.content || '',
          new Date() // Execute immediately
        );
      }

      if (immediateJobs.length > 0) {
        console.log(`🚀 Processed ${immediateJobs.length} immediate jobs`);
      }
    } catch (error) {
      console.error('❌ Failed to process immediate jobs:', error);
    }
  }

  /**
   * Setup graceful shutdown handlers
   */
  private setupShutdownHandlers(): void {
    const gracefulShutdown = () => {
      console.log('🔄 Graceful shutdown initiated...');
      
      // Clear all scheduled timeouts
      this.scheduledJobs.forEach((timeoutId, jobId) => {
        clearTimeout(timeoutId);
        console.log(`⏹️ Cleared timeout for job ${jobId}`);
      });
      this.scheduledJobs.clear();

      // Terminate all workers
      this.jobWorkers.forEach((worker, jobId) => {
        worker.terminate();
        console.log(`⏹️ Terminated worker for job ${jobId}`);
      });
      this.jobWorkers.clear();

      // Stop the resilient auto-poster
      resilientAutoPoster.stop();

      console.log('✅ Graceful shutdown complete');
      process.exit(0);
    };

    // Handle various shutdown signals
    process.on('SIGINT', gracefulShutdown);
    process.on('SIGTERM', gracefulShutdown);
    process.on('SIGUSR1', gracefulShutdown);
    process.on('SIGUSR2', gracefulShutdown);

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      console.error('❌ Uncaught exception:', error);
      gracefulShutdown();
    });

    process.on('unhandledRejection', (reason, promise) => {
      console.error('❌ Unhandled rejection at:', promise, 'reason:', reason);
      gracefulShutdown();
    });
  }

  /**
   * Get job status
   */
  getJobStatus(jobId: string) {
    return resilientAutoPoster.getJobStatus(jobId);
  }

  /**
   * Get all pending jobs
   */
  getPendingJobs() {
    return resilientAutoPoster.getPendingJobs();
  }

  /**
   * Cancel a job
   */
  async cancelJob(jobId: string): Promise<boolean> {
    // Clear any scheduled timeout
    const timeoutId = this.scheduledJobs.get(jobId);
    if (timeoutId) {
      clearTimeout(timeoutId);
      this.scheduledJobs.delete(jobId);
    }

    // Terminate any running worker
    const worker = this.jobWorkers.get(jobId);
    if (worker) {
      worker.terminate();
      this.jobWorkers.delete(jobId);
    }

    // Cancel the job in the resilient auto-poster
    return await resilientAutoPoster.cancelJob(jobId);
  }

  /**
   * Get system health status
   */
  getHealthStatus() {
    const pendingJobs = this.getPendingJobs();
    const scheduledCount = this.scheduledJobs.size;
    const workerCount = this.jobWorkers.size;

    return {
      isInitialized: this.isInitialized,
      pendingJobs: pendingJobs.length,
      scheduledJobs: scheduledCount,
      activeWorkers: workerCount,
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      status: this.isInitialized ? 'healthy' : 'initializing'
    };
  }
}

export const backgroundJobManager = BackgroundJobManager.getInstance();