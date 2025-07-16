/**
 * Quota Manager Service
 * Handles quota tracking and management for all platforms
 */

export class QuotaManager {
  private static quotas: Map<string, { used: number; limit: number; resetTime: Date }> = new Map();
  private static readonly DAILY_LIMITS = {
    'Facebook': 50,
    'Instagram': 50,
    'LinkedIn': 30,
    'X': 100,
    'YouTube': 20
  };

  /**
   * Initialize quota manager
   */
  static initialize(): void {
    // Initialize quotas for all platforms
    for (const [platform, limit] of Object.entries(this.DAILY_LIMITS)) {
      this.quotas.set(platform, {
        used: 0,
        limit,
        resetTime: this.getNextResetTime()
      });
    }

    // Set up daily reset
    this.setupDailyReset();
    console.log('✅ Quota Manager initialized');
  }

  /**
   * Check if platform has quota available
   */
  static async checkQuota(platform: string): Promise<boolean> {
    const quota = this.quotas.get(platform);
    if (!quota) return false;

    // Check if quota needs reset
    if (new Date() >= quota.resetTime) {
      this.resetQuota(platform);
      return true;
    }

    return quota.used < quota.limit;
  }

  /**
   * Get remaining quota for platform
   */
  static async getRemainingQuota(platform: string): Promise<number> {
    const quota = this.quotas.get(platform);
    if (!quota) return 0;

    // Check if quota needs reset
    if (new Date() >= quota.resetTime) {
      this.resetQuota(platform);
      return quota.limit;
    }

    return Math.max(0, quota.limit - quota.used);
  }

  /**
   * Use quota for platform
   */
  static async useQuota(platform: string, amount: number = 1): Promise<boolean> {
    const quota = this.quotas.get(platform);
    if (!quota) return false;

    // Check if quota needs reset
    if (new Date() >= quota.resetTime) {
      this.resetQuota(platform);
    }

    // Check if we have enough quota
    if (quota.used + amount > quota.limit) {
      return false;
    }

    // Use quota
    quota.used += amount;
    this.quotas.set(platform, quota);
    
    console.log(`📊 Used ${amount} quota for ${platform}. Remaining: ${quota.limit - quota.used}`);
    return true;
  }

  /**
   * Reset quota for platform
   */
  static async resetQuota(platform: string): Promise<void> {
    const quota = this.quotas.get(platform);
    if (!quota) return;

    quota.used = 0;
    quota.resetTime = this.getNextResetTime();
    this.quotas.set(platform, quota);
    
    console.log(`🔄 Reset quota for ${platform}`);
  }

  /**
   * Get quota status for all platforms
   */
  static async getQuotaStatus(): Promise<any> {
    const status: any = {};
    
    for (const [platform, quota] of Array.from(this.quotas.entries())) {
      // Check if quota needs reset
      if (new Date() >= quota.resetTime) {
        this.resetQuota(platform);
      }

      status[platform] = {
        used: quota.used,
        limit: quota.limit,
        remaining: quota.limit - quota.used,
        resetTime: quota.resetTime.toISOString(),
        percentageUsed: Math.round((quota.used / quota.limit) * 100)
      };
    }

    return status;
  }

  /**
   * Get quota summary
   */
  static async getQuotaSummary(): Promise<any> {
    const status = await this.getQuotaStatus();
    
    let totalUsed = 0;
    let totalLimit = 0;
    let platformsAtLimit = 0;
    
    for (const [platform, quota] of Object.entries(status)) {
      const q = quota as any;
      totalUsed += q.used;
      totalLimit += q.limit;
      if (q.used >= q.limit) {
        platformsAtLimit++;
      }
    }

    return {
      totalUsed,
      totalLimit,
      totalRemaining: totalLimit - totalUsed,
      overallPercentage: Math.round((totalUsed / totalLimit) * 100),
      platformsAtLimit,
      totalPlatforms: Object.keys(status).length,
      nextReset: this.getNextResetTime().toISOString()
    };
  }

  /**
   * Check if platform is at quota limit
   */
  static async isAtQuotaLimit(platform: string): Promise<boolean> {
    const quota = this.quotas.get(platform);
    if (!quota) return true;

    // Check if quota needs reset
    if (new Date() >= quota.resetTime) {
      this.resetQuota(platform);
      return false;
    }

    return quota.used >= quota.limit;
  }

  /**
   * Get next reset time (next midnight)
   */
  private static getNextResetTime(): Date {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    return tomorrow;
  }

  /**
   * Setup daily reset interval
   */
  private static setupDailyReset(): void {
    const now = new Date();
    const tomorrow = this.getNextResetTime();
    const msUntilReset = tomorrow.getTime() - now.getTime();

    // Schedule first reset
    setTimeout(() => {
      this.resetAllQuotas();
      
      // Then set up daily interval
      setInterval(() => {
        this.resetAllQuotas();
      }, 24 * 60 * 60 * 1000); // 24 hours
    }, msUntilReset);
  }

  /**
   * Reset all quotas
   */
  private static resetAllQuotas(): void {
    for (const platform of Object.keys(this.DAILY_LIMITS)) {
      this.resetQuota(platform);
    }
    console.log('🔄 All quotas reset for new day');
  }

  /**
   * Get quota statistics
   */
  static getStats(): any {
    const stats: any = {};
    
    for (const [platform, quota] of Array.from(this.quotas.entries())) {
      stats[platform] = {
        used: quota.used,
        limit: quota.limit,
        remaining: quota.limit - quota.used,
        percentageUsed: Math.round((quota.used / quota.limit) * 100),
        resetTime: quota.resetTime.toISOString()
      };
    }

    return stats;
  }
}

// Initialize quota manager on module load
QuotaManager.initialize();