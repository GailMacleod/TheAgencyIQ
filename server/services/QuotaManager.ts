/**
 * PERSISTENT QUOTA MANAGEMENT SYSTEM
 * Prevents resource abuse and ensures fair usage across all subscribers
 */

import Database from '@replit/database';

interface UserQuota {
  userId: number;
  dailyAPICalls: number;
  dailyVideoGens: number;
  dailyContentGens: number;
  lastResetDate: string;
  subscriptionTier: 'free' | 'professional' | 'enterprise';
  quotaLimits: {
    dailyAPILimit: number;
    dailyVideoLimit: number;
    dailyContentLimit: number;
  };
}

interface QuotaLimits {
  free: {
    dailyAPILimit: 5;
    dailyVideoLimit: 1;
    dailyContentLimit: 2;
  };
  professional: {
    dailyAPILimit: 100;
    dailyVideoLimit: 10;
    dailyContentLimit: 20;
  };
  enterprise: {
    dailyAPILimit: 500;
    dailyVideoLimit: 50;
    dailyContentLimit: 100;
  };
}

class QuotaManager {
  private db: Database;
  private quotaLimits: QuotaLimits;

  constructor() {
    this.db = new Database();
    this.quotaLimits = {
      free: {
        dailyAPILimit: 5,
        dailyVideoLimit: 1,
        dailyContentLimit: 2
      },
      professional: {
        dailyAPILimit: 100,
        dailyVideoLimit: 10,
        dailyContentLimit: 20
      },
      enterprise: {
        dailyAPILimit: 500,
        dailyVideoLimit: 50,
        dailyContentLimit: 100
      }
    };
  }

  /**
   * Get or create user quota record
   */
  async getUserQuota(userId: number, subscriptionTier: 'free' | 'professional' | 'enterprise' = 'professional'): Promise<UserQuota> {
    const quotaKey = `quota:${userId}`;
    const today = new Date().toDateString();
    
    try {
      let quota = await this.db.get(quotaKey) as UserQuota;
      
      // Create new quota if doesn't exist
      if (!quota) {
        quota = {
          userId,
          dailyAPICalls: 0,
          dailyVideoGens: 0,
          dailyContentGens: 0,
          lastResetDate: today,
          subscriptionTier,
          quotaLimits: this.quotaLimits[subscriptionTier]
        };
        await this.db.set(quotaKey, quota);
        console.log(`✅ Created new quota for user ${userId} (${subscriptionTier})`);
        return quota;
      }

      // Reset daily counts if new day
      if (quota.lastResetDate !== today) {
        quota.dailyAPICalls = 0;
        quota.dailyVideoGens = 0;
        quota.dailyContentGens = 0;
        quota.lastResetDate = today;
        quota.subscriptionTier = subscriptionTier; // Update subscription tier
        quota.quotaLimits = this.quotaLimits[subscriptionTier];
        
        await this.db.set(quotaKey, quota);
        console.log(`🔄 Reset daily quota for user ${userId} (${subscriptionTier})`);
      }

      return quota;
    } catch (error) {
      console.error(`❌ Failed to get quota for user ${userId}:`, error);
      // Return safe default quota on error
      return {
        userId,
        dailyAPICalls: 0,
        dailyVideoGens: 0,
        dailyContentGens: 0,
        lastResetDate: today,
        subscriptionTier,
        quotaLimits: this.quotaLimits[subscriptionTier]
      };
    }
  }

  /**
   * Check if user can perform API call
   */
  async canMakeAPICall(userId: number, subscriptionTier: 'free' | 'professional' | 'enterprise' = 'professional'): Promise<{ allowed: boolean; quota: UserQuota; message?: string }> {
    const quota = await this.getUserQuota(userId, subscriptionTier);
    
    if (quota.dailyAPICalls >= quota.quotaLimits.dailyAPILimit) {
      return {
        allowed: false,
        quota,
        message: `Daily API limit reached (${quota.dailyAPICalls}/${quota.quotaLimits.dailyAPILimit}). Upgrade to increase limits.`
      };
    }

    return { allowed: true, quota };
  }

  /**
   * Check if user can generate video
   */
  async canGenerateVideo(userId: number, subscriptionTier: 'free' | 'professional' | 'enterprise' = 'professional'): Promise<{ allowed: boolean; quota: UserQuota; message?: string }> {
    const quota = await this.getUserQuota(userId, subscriptionTier);
    
    if (quota.dailyVideoGens >= quota.quotaLimits.dailyVideoLimit) {
      return {
        allowed: false,
        quota,
        message: `Daily video generation limit reached (${quota.dailyVideoGens}/${quota.quotaLimits.dailyVideoLimit}). Try again tomorrow.`
      };
    }

    return { allowed: true, quota };
  }

  /**
   * Check if user can generate content
   */
  async canGenerateContent(userId: number, subscriptionTier: 'free' | 'professional' | 'enterprise' = 'professional'): Promise<{ allowed: boolean; quota: UserQuota; message?: string }> {
    const quota = await this.getUserQuota(userId, subscriptionTier);
    
    if (quota.dailyContentGens >= quota.quotaLimits.dailyContentLimit) {
      return {
        allowed: false,
        quota,
        message: `Daily content generation limit reached (${quota.dailyContentGens}/${quota.quotaLimits.dailyContentLimit}). Upgrade for more.`
      };
    }

    return { allowed: true, quota };
  }

  /**
   * Record API call usage
   */
  async recordAPICall(userId: number, subscriptionTier: 'free' | 'professional' | 'enterprise' = 'professional'): Promise<UserQuota> {
    const quota = await this.getUserQuota(userId, subscriptionTier);
    quota.dailyAPICalls += 1;
    
    const quotaKey = `quota:${userId}`;
    await this.db.set(quotaKey, quota);
    
    console.log(`📊 API call recorded for user ${userId}: ${quota.dailyAPICalls}/${quota.quotaLimits.dailyAPILimit}`);
    
    // Add throttling for burst protection
    if (quota.dailyAPICalls > quota.quotaLimits.dailyAPILimit * 0.8) {
      await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second throttle
      console.log(`⚡ Throttling user ${userId} - approaching limit`);
    }
    
    return quota;
  }

  /**
   * Record video generation usage
   */
  async recordVideoGeneration(userId: number, subscriptionTier: 'free' | 'professional' | 'enterprise' = 'professional'): Promise<UserQuota> {
    const quota = await this.getUserQuota(userId, subscriptionTier);
    quota.dailyVideoGens += 1;
    
    const quotaKey = `quota:${userId}`;
    await this.db.set(quotaKey, quota);
    
    console.log(`🎬 Video generation recorded for user ${userId}: ${quota.dailyVideoGens}/${quota.quotaLimits.dailyVideoLimit}`);
    return quota;
  }

  /**
   * Record content generation usage
   */
  async recordContentGeneration(userId: number, subscriptionTier: 'free' | 'professional' | 'enterprise' = 'professional'): Promise<UserQuota> {
    const quota = await this.getUserQuota(userId, subscriptionTier);
    quota.dailyContentGens += 1;
    
    const quotaKey = `quota:${userId}`;
    await this.db.set(quotaKey, quota);
    
    console.log(`📝 Content generation recorded for user ${userId}: ${quota.dailyContentGens}/${quota.quotaLimits.dailyContentLimit}`);
    return quota;
  }

  /**
   * Get usage statistics for admin monitoring
   */
  async getUsageStats(): Promise<{ totalUsers: number; activeToday: number; quotaStats: any }> {
    try {
      const allKeys = await this.db.list();
      const quotaKeys = allKeys.filter((key: string) => key.startsWith('quota:'));
      
      const today = new Date().toDateString();
      let activeToday = 0;
      const quotaStats = {
        free: { users: 0, totalAPICalls: 0, totalVideoGens: 0 },
        professional: { users: 0, totalAPICalls: 0, totalVideoGens: 0 },
        enterprise: { users: 0, totalAPICalls: 0, totalVideoGens: 0 }
      };

      for (const key of quotaKeys) {
        const quota = await this.db.get(key) as UserQuota;
        if (quota && quota.lastResetDate === today) {
          activeToday++;
          quotaStats[quota.subscriptionTier].users++;
          quotaStats[quota.subscriptionTier].totalAPICalls += quota.dailyAPICalls;
          quotaStats[quota.subscriptionTier].totalVideoGens += quota.dailyVideoGens;
        }
      }

      return {
        totalUsers: quotaKeys.length,
        activeToday,
        quotaStats
      };
    } catch (error) {
      console.error('❌ Failed to get usage stats:', error);
      return { totalUsers: 0, activeToday: 0, quotaStats: {} };
    }
  }

  /**
   * Emergency quota reset for admin use
   */
  async resetUserQuota(userId: number): Promise<boolean> {
    try {
      const quotaKey = `quota:${userId}`;
      await this.db.delete(quotaKey);
      console.log(`🔥 Emergency quota reset for user ${userId}`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to reset quota for user ${userId}:`, error);
      return false;
    }
  }

  /**
   * Bulk quota cleanup for maintenance
   */
  async cleanupOldQuotas(daysOld: number = 30): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);
      const cutoffString = cutoffDate.toDateString();

      const allKeys = await this.db.list();
      const quotaKeys = allKeys.filter((key: string) => key.startsWith('quota:'));
      
      let cleanedCount = 0;
      for (const key of quotaKeys) {
        const quota = await this.db.get(key) as UserQuota;
        if (quota && quota.lastResetDate < cutoffString) {
          await this.db.delete(key);
          cleanedCount++;
        }
      }

      console.log(`🧹 Cleaned up ${cleanedCount} old quota records`);
      return cleanedCount;
    } catch (error) {
      console.error('❌ Failed to cleanup old quotas:', error);
      return 0;
    }
  }
}

export const quotaManager = new QuotaManager();
export default QuotaManager;