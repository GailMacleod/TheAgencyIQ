/**
 * Auto Post Scheduler Service
 * Handles scheduling and execution of auto posts
 */

import { QuotaManager } from './quota-manager';

interface ScheduledPost {
  id: string;
  content: string;
  platforms: string[];
  scheduledTime: Date;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  maxRetries: number;
  currentRetries: number;
  createdAt: Date;
  lastAttempt?: Date;
  errors?: string[];
}

export class AutoPostScheduler {
  private static posts: Map<string, ScheduledPost> = new Map();
  private static isRunning = false;
  private static intervalId?: NodeJS.Timeout;
  private static readonly CHECK_INTERVAL = 60 * 1000; // 1 minute

  /**
   * Start the scheduler
   */
  static start(): void {
    if (this.isRunning) return;

    this.isRunning = true;
    this.intervalId = setInterval(() => {
      this.processScheduledPosts();
    }, this.CHECK_INTERVAL);

    console.log('✅ Auto Post Scheduler started');
  }

  /**
   * Stop the scheduler
   */
  static stop(): void {
    if (!this.isRunning) return;

    this.isRunning = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }

    console.log('🛑 Auto Post Scheduler stopped');
  }

  /**
   * Schedule a new post
   */
  static async schedulePost(
    content: string,
    platforms: string[],
    scheduledTime: Date,
    maxRetries: number = 3
  ): Promise<string> {
    const postId = this.generatePostId();
    
    const post: ScheduledPost = {
      id: postId,
      content,
      platforms,
      scheduledTime,
      status: 'pending',
      maxRetries,
      currentRetries: 0,
      createdAt: new Date(),
      errors: []
    };

    this.posts.set(postId, post);
    
    console.log(`📅 Scheduled post ${postId} for ${scheduledTime.toISOString()}`);
    return postId;
  }

  /**
   * Cancel a scheduled post
   */
  static cancelPost(postId: string): boolean {
    const post = this.posts.get(postId);
    if (!post || post.status !== 'pending') {
      return false;
    }

    post.status = 'cancelled';
    this.posts.set(postId, post);
    
    console.log(`❌ Cancelled post ${postId}`);
    return true;
  }

  /**
   * Get post status
   */
  static getPostStatus(postId: string): ScheduledPost | null {
    return this.posts.get(postId) || null;
  }

  /**
   * Get all scheduled posts
   */
  static getScheduledPosts(): ScheduledPost[] {
    return Array.from(this.posts.values());
  }

  /**
   * Process scheduled posts
   */
  private static async processScheduledPosts(): Promise<void> {
    const now = new Date();
    
    for (const [postId, post] of this.posts.entries()) {
      if (post.status === 'pending' && now >= post.scheduledTime) {
        await this.executePost(postId, post);
      }
    }
  }

  /**
   * Execute a scheduled post
   */
  private static async executePost(postId: string, post: ScheduledPost): Promise<void> {
    try {
      console.log(`🚀 Executing post ${postId}`);
      
      post.status = 'processing';
      post.lastAttempt = new Date();
      this.posts.set(postId, post);

      const results = await this.publishToPlatforms(post.content, post.platforms);
      
      // Check if all platforms succeeded
      const allSucceeded = results.every(r => r.success);
      
      if (allSucceeded) {
        post.status = 'completed';
        console.log(`✅ Post ${postId} completed successfully`);
      } else {
        // Some platforms failed, retry if possible
        const failures = results.filter(r => !r.success);
        post.errors = post.errors || [];
        post.errors.push(...failures.map(f => f.error));
        
        if (post.currentRetries < post.maxRetries) {
          post.currentRetries++;
          post.status = 'pending';
          
          // Reschedule for retry (5 minutes later)
          post.scheduledTime = new Date(Date.now() + 5 * 60 * 1000);
          console.log(`🔄 Retrying post ${postId} (attempt ${post.currentRetries}/${post.maxRetries})`);
        } else {
          post.status = 'failed';
          console.log(`❌ Post ${postId} failed after ${post.maxRetries} attempts`);
        }
      }

      this.posts.set(postId, post);
    } catch (error) {
      console.error(`Error executing post ${postId}:`, error);
      post.status = 'failed';
      post.errors = post.errors || [];
      post.errors.push(error.message);
      this.posts.set(postId, post);
    }
  }

  /**
   * Publish to platforms
   */
  private static async publishToPlatforms(content: string, platforms: string[]): Promise<any[]> {
    const results = [];
    
    for (const platform of platforms) {
      try {
        // Check quota
        const hasQuota = await QuotaManager.checkQuota(platform);
        if (!hasQuota) {
          results.push({
            platform,
            success: false,
            error: `No quota available for ${platform}`
          });
          continue;
        }

        // Mock publish for now (in production would use real API)
        const success = await this.mockPublish(platform, content);
        
        if (success) {
          // Use quota
          await QuotaManager.useQuota(platform, 1);
          results.push({
            platform,
            success: true,
            postId: `${platform.toLowerCase()}_${Date.now()}`
          });
        } else {
          results.push({
            platform,
            success: false,
            error: `Failed to publish to ${platform}`
          });
        }
      } catch (error) {
        results.push({
          platform,
          success: false,
          error: error.message
        });
      }
    }

    return results;
  }

  /**
   * Mock publish (replace with real API calls in production)
   */
  private static async mockPublish(platform: string, content: string): Promise<boolean> {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Mock success/failure (90% success rate)
    const success = Math.random() > 0.1;
    
    console.log(`📤 Mock publish to ${platform}: ${success ? 'SUCCESS' : 'FAILED'}`);
    return success;
  }

  /**
   * Generate post ID
   */
  private static generatePostId(): string {
    return `post_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get scheduler statistics
   */
  static getStats(): any {
    const posts = Array.from(this.posts.values());
    
    return {
      totalPosts: posts.length,
      pending: posts.filter(p => p.status === 'pending').length,
      processing: posts.filter(p => p.status === 'processing').length,
      completed: posts.filter(p => p.status === 'completed').length,
      failed: posts.filter(p => p.status === 'failed').length,
      cancelled: posts.filter(p => p.status === 'cancelled').length,
      isRunning: this.isRunning,
      nextCheck: this.isRunning ? new Date(Date.now() + this.CHECK_INTERVAL).toISOString() : null
    };
  }

  /**
   * Clean up old posts (keep only last 100)
   */
  static cleanupOldPosts(): void {
    const posts = Array.from(this.posts.entries());
    
    if (posts.length > 100) {
      // Sort by created date and keep only the most recent 100
      posts.sort((a, b) => b[1].createdAt.getTime() - a[1].createdAt.getTime());
      
      // Remove old posts
      const toRemove = posts.slice(100);
      for (const [postId] of toRemove) {
        this.posts.delete(postId);
      }
      
      console.log(`🧹 Cleaned up ${toRemove.length} old posts`);
    }
  }
}