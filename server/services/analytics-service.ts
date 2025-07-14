import { storage } from '../storage';

export interface UserActivity {
  userId: number;
  userEmail: string;
  action: string;
  timestamp: Date;
  metadata?: any;
}

export interface QuotaUsageAnalytics {
  userId: number;
  userEmail: string;
  subscriptionPlan: string;
  totalPosts: number;
  usedPosts: number;
  remainingPosts: number;
  usagePercentage: number;
  lastActivity: Date;
  cycleStartDate: Date;
  cycleEndDate: Date;
}

export interface PublishSuccessRate {
  userId: number;
  userEmail: string;
  platform: string;
  totalAttempts: number;
  successfulPublishes: number;
  failedPublishes: number;
  successRate: number;
  averageResponseTime: number;
  lastPublishAttempt: Date;
}

export interface SystemAnalytics {
  totalActiveUsers: number;
  totalSubscriptions: number;
  totalPostsPublished: number;
  platformSuccessRates: { [platform: string]: number };
  overallSuccessRate: number;
  averageQuotaUsage: number;
  mostActiveUsers: { userId: number; userEmail: string; activityCount: number }[];
}

class AnalyticsService {
  private userActivities: UserActivity[] = [];
  private quotaUsageData: Map<number, QuotaUsageAnalytics> = new Map();
  private publishSuccessData: Map<string, PublishSuccessRate> = new Map();

  // Track user activity
  async trackUserActivity(userId: number, userEmail: string, action: string, metadata?: any) {
    const activity: UserActivity = {
      userId,
      userEmail,
      action,
      timestamp: new Date(),
      metadata
    };

    this.userActivities.push(activity);
    console.log(`📊 Analytics: User ${userId} (${userEmail}) - ${action}`);

    // Keep only last 10000 activities to prevent memory issues
    if (this.userActivities.length > 10000) {
      this.userActivities = this.userActivities.slice(-5000);
    }

    return activity;
  }

  // Track quota usage
  async trackQuotaUsage(userId: number): Promise<QuotaUsageAnalytics> {
    try {
      const user = await storage.getUser(userId);
      if (!user) {
        throw new Error(`User ${userId} not found`);
      }

      const usageData: QuotaUsageAnalytics = {
        userId,
        userEmail: user.email,
        subscriptionPlan: user.subscriptionPlan || 'free',
        totalPosts: user.totalPosts || 0,
        usedPosts: (user.totalPosts || 0) - (user.remainingPosts || 0),
        remainingPosts: user.remainingPosts || 0,
        usagePercentage: user.totalPosts > 0 ? ((user.totalPosts - user.remainingPosts) / user.totalPosts) * 100 : 0,
        lastActivity: new Date(),
        cycleStartDate: user.subscriptionStartDate || new Date(),
        cycleEndDate: user.subscriptionEndDate || new Date()
      };

      this.quotaUsageData.set(userId, usageData);
      return usageData;
    } catch (error) {
      console.error(`Error tracking quota usage for user ${userId}:`, error);
      throw error;
    }
  }

  // Track publish success rates
  async trackPublishAttempt(userId: number, userEmail: string, platform: string, success: boolean, responseTime: number) {
    const key = `${userId}-${platform}`;
    const existing = this.publishSuccessData.get(key);

    if (existing) {
      existing.totalAttempts++;
      if (success) {
        existing.successfulPublishes++;
      } else {
        existing.failedPublishes++;
      }
      existing.successRate = (existing.successfulPublishes / existing.totalAttempts) * 100;
      existing.averageResponseTime = (existing.averageResponseTime + responseTime) / 2;
      existing.lastPublishAttempt = new Date();
    } else {
      const newData: PublishSuccessRate = {
        userId,
        userEmail,
        platform,
        totalAttempts: 1,
        successfulPublishes: success ? 1 : 0,
        failedPublishes: success ? 0 : 1,
        successRate: success ? 100 : 0,
        averageResponseTime: responseTime,
        lastPublishAttempt: new Date()
      };
      this.publishSuccessData.set(key, newData);
    }

    console.log(`📈 Publish Analytics: User ${userId} (${userEmail}) - ${platform} - ${success ? 'SUCCESS' : 'FAILED'} (${responseTime}ms)`);
  }

  // Get user activity analytics
  async getUserActivityAnalytics(userId: number): Promise<UserActivity[]> {
    return this.userActivities.filter(activity => activity.userId === userId);
  }

  // Get quota usage analytics
  async getQuotaUsageAnalytics(userId: number): Promise<QuotaUsageAnalytics | null> {
    const cached = this.quotaUsageData.get(userId);
    if (cached) {
      return cached;
    }

    // Generate fresh analytics
    try {
      return await this.trackQuotaUsage(userId);
    } catch (error) {
      console.error(`Error getting quota analytics for user ${userId}:`, error);
      return null;
    }
  }

  // Get publish success analytics
  async getPublishSuccessAnalytics(userId: number): Promise<PublishSuccessRate[]> {
    const userPublishData: PublishSuccessRate[] = [];
    
    for (const [key, data] of this.publishSuccessData) {
      if (data.userId === userId) {
        userPublishData.push(data);
      }
    }

    return userPublishData;
  }

  // Get system-wide analytics
  async getSystemAnalytics(): Promise<SystemAnalytics> {
    try {
      // Get all users from storage
      const users = await storage.getAllUsers();
      const activeUsers = users.filter(user => user.subscriptionActive);
      const totalSubscriptions = activeUsers.length;

      // Calculate platform success rates
      const platformStats: { [platform: string]: { total: number; successful: number } } = {};
      let totalPublishAttempts = 0;
      let totalSuccessfulPublishes = 0;

      for (const [key, data] of this.publishSuccessData) {
        if (!platformStats[data.platform]) {
          platformStats[data.platform] = { total: 0, successful: 0 };
        }
        platformStats[data.platform].total += data.totalAttempts;
        platformStats[data.platform].successful += data.successfulPublishes;
        totalPublishAttempts += data.totalAttempts;
        totalSuccessfulPublishes += data.successfulPublishes;
      }

      // Calculate platform success rates
      const platformSuccessRates: { [platform: string]: number } = {};
      for (const [platform, stats] of Object.entries(platformStats)) {
        platformSuccessRates[platform] = stats.total > 0 ? (stats.successful / stats.total) * 100 : 0;
      }

      // Calculate overall success rate
      const overallSuccessRate = totalPublishAttempts > 0 ? (totalSuccessfulPublishes / totalPublishAttempts) * 100 : 0;

      // Calculate average quota usage
      const totalQuotaUsage = Array.from(this.quotaUsageData.values()).reduce((sum, data) => sum + data.usagePercentage, 0);
      const averageQuotaUsage = this.quotaUsageData.size > 0 ? totalQuotaUsage / this.quotaUsageData.size : 0;

      // Get most active users
      const activityCounts: { [userId: number]: { userEmail: string; count: number } } = {};
      for (const activity of this.userActivities) {
        if (!activityCounts[activity.userId]) {
          activityCounts[activity.userId] = { userEmail: activity.userEmail, count: 0 };
        }
        activityCounts[activity.userId].count++;
      }

      const mostActiveUsers = Object.entries(activityCounts)
        .map(([userId, data]) => ({
          userId: parseInt(userId),
          userEmail: data.userEmail,
          activityCount: data.count
        }))
        .sort((a, b) => b.activityCount - a.activityCount)
        .slice(0, 10);

      return {
        totalActiveUsers: activeUsers.length,
        totalSubscriptions,
        totalPostsPublished: totalSuccessfulPublishes,
        platformSuccessRates,
        overallSuccessRate,
        averageQuotaUsage,
        mostActiveUsers
      };
    } catch (error) {
      console.error('Error generating system analytics:', error);
      throw error;
    }
  }

  // Reset analytics data (for testing or maintenance)
  resetAnalytics() {
    this.userActivities = [];
    this.quotaUsageData.clear();
    this.publishSuccessData.clear();
    console.log('📊 Analytics data reset');
  }

  // Export analytics data for reporting
  async exportAnalytics() {
    return {
      userActivities: this.userActivities,
      quotaUsageData: Array.from(this.quotaUsageData.values()),
      publishSuccessData: Array.from(this.publishSuccessData.values()),
      systemAnalytics: await this.getSystemAnalytics()
    };
  }
}

export const analyticsService = new AnalyticsService();