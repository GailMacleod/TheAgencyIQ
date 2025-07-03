/**
 * CENTRALIZED POST QUOTA SERVICE WITH DYNAMIC 30-DAY CYCLES
 * Single source of truth for all post counting and quota management
 * Dynamic subscription cycles per customer with Brisbane Ekka integration
 */

import { storage } from './storage';
import { db } from './db';
import { users, posts, postLedger } from '../shared/schema';
import { eq, and, sql } from 'drizzle-orm';

interface QuotaStatus {
  userId: number;
  remainingPosts: number;
  totalPosts: number;
  subscriptionPlan: string | null;
  subscriptionActive: boolean;
}

interface PostCountSummary {
  approved: number;
  draft: number;
  published: number;
  failed: number;
  total: number;
}

export class PostQuotaService {
  
  /**
   * PLAN QUOTAS - Single source of truth
   */
  private static readonly PLAN_QUOTAS = {
    'starter': 12,
    'growth': 27, 
    'professional': 52
  };

  /**
   * DYNAMIC 30-DAY CYCLE MANAGEMENT PER CUSTOMER SUBSCRIPTION
   * Brisbane Ekka focus when cycles overlap July 9-19, 2025
   */
  private static readonly EKKA_START = new Date('2025-07-09T00:00:00.000Z');
  private static readonly EKKA_END = new Date('2025-07-19T23:59:59.999Z');
  
  /**
   * Get user's cycle dates based on their subscription start date
   */
  static getUserCycleDates(subscriptionStart: Date): { cycleStart: Date; cycleEnd: Date } {
    const cycleStart = new Date(subscriptionStart);
    const cycleEnd = new Date(cycleStart);
    cycleEnd.setDate(cycleEnd.getDate() + 30);
    
    return { cycleStart, cycleEnd };
  }

  /**
   * Check if user is within their current 30-day cycle
   */
  static isWithinUserCycle(subscriptionStart: Date): boolean {
    const now = new Date();
    const { cycleStart, cycleEnd } = this.getUserCycleDates(subscriptionStart);
    return now >= cycleStart && now <= cycleEnd;
  }

  /**
   * Check if user's cycle overlaps with Brisbane Ekka window
   */
  static hasBrisbaneEkkaOverlap(subscriptionStart: Date): boolean {
    const { cycleStart, cycleEnd } = this.getUserCycleDates(subscriptionStart);
    return (cycleStart <= this.EKKA_END && cycleEnd >= this.EKKA_START);
  }

  /**
   * Initialize quota for a new customer based on subscription plan
   */
  static async initializeQuota(userId: number, plan: string = 'professional'): Promise<void> {
    const totalPosts = this.PLAN_QUOTAS[plan] || 52;
    
    try {
      await db.update(users)
        .set({
          subscriptionPlan: plan,
          totalPosts: totalPosts,
          remainingPosts: totalPosts,
          subscriptionActive: true,
          subscriptionStart: new Date()
        })
        .where(eq(users.id, userId));
      
      console.log(`✅ Quota initialized for user ${userId}: ${totalPosts} posts (${plan} plan)`);
    } catch (error) {
      console.error(`❌ Failed to initialize quota for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Get current quota status for a user
   */
  static async getQuotaStatus(userId: number): Promise<QuotaStatus | null> {
    try {
      const user = await db.select().from(users).where(eq(users.id, userId)).limit(1);
      
      if (user.length === 0) {
        console.warn(`⚠️ User ${userId} not found`);
        return null;
      }

      const userData = user[0];
      return {
        userId: userData.id,
        remainingPosts: userData.remainingPosts || 0,
        totalPosts: userData.totalPosts || 0,
        subscriptionPlan: userData.subscriptionPlan,
        subscriptionActive: userData.subscriptionActive || false
      };
    } catch (error) {
      console.error(`❌ Failed to get quota status for user ${userId}:`, error);
      return null;
    }
  }

  /**
   * APPROVE POST - Status change without quota impact
   * Part 1 of split functionality
   */
  static async approvePost(postId: number): Promise<boolean> {
    try {
      await db.update(posts)
        .set({ 
          status: 'approved'
        })
        .where(eq(posts.id, postId));
      
      console.log(`✅ Post ${postId} approved (no quota deduction)`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to approve post ${postId}:`, error);
      return false;
    }
  }

  /**
   * POST APPROVED - Quota deduction after successful platform publishing
   * Part 2 of split functionality - only called after confirmed publishing
   */
  static async postApproved(userId: number, postId: number): Promise<boolean> {
    try {
      const quotaStatus = await this.getQuotaStatus(userId);
      if (!quotaStatus || quotaStatus.remainingPosts <= 0) {
        console.warn(`⚠️ No quota remaining for user ${userId}`);
        return false;
      }

      // Update users table (backward compatibility)
      await db.update(users)
        .set({ 
          remainingPosts: quotaStatus.remainingPosts - 1
        })
        .where(eq(users.id, userId));

      // Update post status to published
      await db.update(posts)
        .set({ 
          status: 'published',
          publishedAt: new Date()
        })
        .where(eq(posts.id, postId));

      console.log(`✅ Post ${postId} quota deducted - User ${userId}: ${quotaStatus.remainingPosts - 1} remaining`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to deduct quota for post ${postId}:`, error);
      return false;
    }
  }

  /**
   * DEPRECATED: Legacy deductPost method - use approvePost/postApproved split instead
   */
  static async deductPost(userId: number): Promise<boolean> {
    console.warn('⚠️ deductPost() is deprecated - use approvePost() and postApproved() split functionality');
    return false;
  }

  /**
   * Validate quota before operations
   */
  static async validateQuota(userId: number, requestedPosts: number = 1): Promise<boolean> {
    const quotaStatus = await this.getQuotaStatus(userId);
    if (!quotaStatus) return false;
    
    return quotaStatus.remainingPosts >= requestedPosts && quotaStatus.subscriptionActive;
  }

  /**
   * Upgrade subscription plan
   */
  static async upgradePlan(userId: number, newPlan: string): Promise<boolean> {
    const newQuota = this.PLAN_QUOTAS[newPlan];
    if (!newQuota) return false;

    try {
      await db.update(users)
        .set({
          subscriptionPlan: newPlan,
          totalPosts: newQuota,
          remainingPosts: newQuota,
          subscriptionStart: new Date() // Reset cycle on upgrade
        })
        .where(eq(users.id, userId));
      
      console.log(`✅ User ${userId} upgraded to ${newPlan} plan with ${newQuota} posts`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to upgrade user ${userId}:`, error);
      return false;
    }
  }

  /**
   * Get post count summary for a user
   */
  static async getPostSummary(userId: number): Promise<PostCountSummary> {
    try {
      const userPosts = await db.select().from(posts).where(eq(posts.userId, userId));
      
      const summary: PostCountSummary = {
        approved: 0,
        draft: 0,
        published: 0,
        failed: 0,
        total: userPosts.length
      };

      userPosts.forEach(post => {
        switch (post.status) {
          case 'approved': summary.approved++; break;
          case 'draft': summary.draft++; break;
          case 'published': summary.published++; break;
          case 'failed': summary.failed++; break;
        }
      });

      return summary;
    } catch (error) {
      console.error(`❌ Failed to get post summary for user ${userId}:`, error);
      return { approved: 0, draft: 0, published: 0, failed: 0, total: 0 };
    }
  }

  /**
   * Enhanced debug function with dynamic cycle information
   */
  static async debugQuotaAndSimulateReset(userId: number = 2): Promise<void> {
    console.log('\n🔍 POST QUOTA SERVICE DEBUG - DYNAMIC 30-DAY CYCLES');
    console.log('=' .repeat(60));
    
    const quotaStatus = await this.getQuotaStatus(userId);
    const postSummary = await this.getPostSummary(userId);
    
    if (quotaStatus) {
      const user = await db.select().from(users).where(eq(users.id, userId)).limit(1);
      const subscriptionStart = user[0]?.subscriptionStart || new Date();
      
      const { cycleStart, cycleEnd } = this.getUserCycleDates(subscriptionStart);
      const withinCycle = this.isWithinUserCycle(subscriptionStart);
      const hasEkkaOverlap = this.hasBrisbaneEkkaOverlap(subscriptionStart);
      
      console.log(`📊 User ${userId} Dynamic Cycle Status:`);
      console.log(`   Subscription Start: ${subscriptionStart.toISOString().split('T')[0]}`);
      console.log(`   Current Cycle: ${cycleStart.toISOString().split('T')[0]} to ${cycleEnd.toISOString().split('T')[0]}`);
      console.log(`   Within Cycle: ${withinCycle ? 'YES' : 'NO'}`);
      console.log(`   Brisbane Ekka Overlap: ${hasEkkaOverlap ? 'YES (July 9-19)' : 'NO'}`);
      console.log(`   Plan: ${quotaStatus.subscriptionPlan || 'unknown'}`);
      console.log(`   Total Posts: ${quotaStatus.totalPosts}`);
      console.log(`   Remaining: ${quotaStatus.remainingPosts}`);
      console.log(`   Active: ${quotaStatus.subscriptionActive ? 'YES' : 'NO'}`);
      console.log(`\n📈 Post Breakdown:`);
      console.log(`   Draft: ${postSummary.draft}`);
      console.log(`   Approved: ${postSummary.approved}`);
      console.log(`   Published: ${postSummary.published}`);
      console.log(`   Failed: ${postSummary.failed}`);
      console.log(`   Total: ${postSummary.total}`);
    }
    
    console.log('\n✅ Debug complete - no live data modified');
  }
}