import { db } from '../db';
import { sql } from 'drizzle-orm';
import { userQuotas } from '@shared/schema';

interface PlatformQuotas {
  facebook: number;
  instagram: number;
  twitter: number;
  linkedin: number;
  youtube: number;
}

interface QuotaUsage {
  used: number;
  limit: number;
  remaining: number;
  resetDate: Date;
}

export class QuotaManager {
  private readonly DEFAULT_QUOTAS: PlatformQuotas = {
    facebook: 52,
    instagram: 52,
    twitter: 52,
    linkedin: 52,
    youtube: 52
  };

  async getUserQuotas(userId: number): Promise<PlatformQuotas> {
    try {
      const result = await db.execute(sql`
        SELECT platform_quotas FROM user_quotas 
        WHERE user_id = ${userId}
      `);
      
      if (result.rows.length === 0) {
        // Initialize quotas for new user
        await this.initializeUserQuotas(userId);
        return this.DEFAULT_QUOTAS;
      }
      
      const quotas = result.rows[0].platform_quotas as PlatformQuotas;
      return quotas || this.DEFAULT_QUOTAS;
    } catch (error) {
      console.error('Error getting user quotas:', error);
      return this.DEFAULT_QUOTAS;
    }
  }

  async checkQuota(userId: number, platform: string): Promise<boolean> {
    try {
      const quotas = await this.getUserQuotas(userId);
      const platformQuota = quotas[platform as keyof PlatformQuotas];
      
      if (!platformQuota) {
        return false;
      }
      
      // Check current usage
      const usage = await this.getQuotaUsage(userId, platform);
      return usage.remaining > 0;
    } catch (error) {
      console.error('Error checking quota:', error);
      return false;
    }
  }

  async consumeQuota(userId: number, platform: string): Promise<boolean> {
    try {
      const hasQuota = await this.checkQuota(userId, platform);
      if (!hasQuota) {
        return false;
      }
      
      // Record quota consumption
      await db.execute(sql`
        INSERT INTO posts (user_id, platform, content, quota_deducted, created_at)
        VALUES (${userId}, ${platform}, 'Quota consumed', ${true}, ${new Date()})
      `);
      
      console.log(`📊 Quota consumed for user ${userId} on ${platform}`);
      return true;
    } catch (error) {
      console.error('Error consuming quota:', error);
      return false;
    }
  }

  async getQuotaUsage(userId: number, platform: string): Promise<QuotaUsage> {
    try {
      const quotas = await this.getUserQuotas(userId);
      const limit = quotas[platform as keyof PlatformQuotas] || 0;
      
      // Get current month usage
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);
      
      const result = await db.execute(sql`
        SELECT COUNT(*) as used_count
        FROM posts
        WHERE user_id = ${userId}
        AND platform = ${platform}
        AND quota_deducted = true
        AND created_at >= ${startOfMonth}
      `);
      
      const used = parseInt(result.rows[0]?.used_count || '0');
      const remaining = Math.max(0, limit - used);
      
      const resetDate = new Date();
      resetDate.setMonth(resetDate.getMonth() + 1);
      resetDate.setDate(1);
      resetDate.setHours(0, 0, 0, 0);
      
      return {
        used,
        limit,
        remaining,
        resetDate
      };
    } catch (error) {
      console.error('Error getting quota usage:', error);
      return {
        used: 0,
        limit: 0,
        remaining: 0,
        resetDate: new Date()
      };
    }
  }

  async updateQuotas(userId: number, newQuotas: Partial<PlatformQuotas>): Promise<boolean> {
    try {
      const currentQuotas = await this.getUserQuotas(userId);
      const updatedQuotas = { ...currentQuotas, ...newQuotas };
      
      await db.execute(sql`
        UPDATE user_quotas 
        SET platform_quotas = ${JSON.stringify(updatedQuotas)}, updated_at = ${new Date()}
        WHERE user_id = ${userId}
      `);
      
      console.log(`📊 Quotas updated for user ${userId}`);
      return true;
    } catch (error) {
      console.error('Error updating quotas:', error);
      return false;
    }
  }

  async resetMonthlyQuotas(userId: number): Promise<boolean> {
    try {
      // Reset to default quotas
      await db.execute(sql`
        UPDATE user_quotas 
        SET platform_quotas = ${JSON.stringify(this.DEFAULT_QUOTAS)}, updated_at = ${new Date()}
        WHERE user_id = ${userId}
      `);
      
      console.log(`📊 Monthly quotas reset for user ${userId}`);
      return true;
    } catch (error) {
      console.error('Error resetting monthly quotas:', error);
      return false;
    }
  }

  async getAllUserQuotas(userId: number): Promise<Record<string, QuotaUsage>> {
    const platforms = ['facebook', 'instagram', 'twitter', 'linkedin', 'youtube'];
    const quotaUsage: Record<string, QuotaUsage> = {};
    
    for (const platform of platforms) {
      quotaUsage[platform] = await this.getQuotaUsage(userId, platform);
    }
    
    return quotaUsage;
  }

  async checkQuotaThreshold(userId: number, platform: string, threshold: number = 0.8): Promise<boolean> {
    const usage = await this.getQuotaUsage(userId, platform);
    const usagePercentage = usage.used / usage.limit;
    
    return usagePercentage >= threshold;
  }

  private async initializeUserQuotas(userId: number): Promise<void> {
    try {
      await db.execute(sql`
        INSERT INTO user_quotas (user_id, platform_quotas, updated_at)
        VALUES (${userId}, ${JSON.stringify(this.DEFAULT_QUOTAS)}, ${new Date()})
        ON CONFLICT (user_id) DO NOTHING
      `);
    } catch (error) {
      console.error('Error initializing user quotas:', error);
    }
  }
}

export const quotaManager = new QuotaManager();