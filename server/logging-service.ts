/**
 * LOGGING SERVICE - CHAIN TRACKING
 * Tracks the complete flow: User ID → Subscription → Sessions → Posts
 * Provides accountability and debugging for the entire subscription-to-publish pipeline
 */

interface LogEntry {
  id: string;
  timestamp: Date;
  userId: number;
  userEmail: string;
  sessionId?: string;
  subscriptionId?: string;
  action: string;
  details: any;
  success: boolean;
  error?: string;
}

interface UserFlow {
  userId: number;
  userEmail: string;
  subscriptionCreated?: Date;
  subscriptionId?: string;
  lastLogin?: Date;
  sessionIds: string[];
  postsCreated: number;
  quotaUsed: number;
  quotaRemaining: number;
  lastActivity?: Date;
}

class LoggingService {
  private logs: LogEntry[] = [];
  private userFlows: Map<number, UserFlow> = new Map();

  // Generate unique log ID
  private generateLogId(): string {
    return `log_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  }

  // Log subscription creation
  logSubscriptionCreation(userId: number, userEmail: string, subscriptionId: string, success: boolean, details: any, error?: string) {
    const logEntry: LogEntry = {
      id: this.generateLogId(),
      timestamp: new Date(),
      userId,
      userEmail,
      subscriptionId,
      action: 'subscription_creation',
      details,
      success,
      error
    };

    this.logs.push(logEntry);

    // Update user flow
    if (success) {
      const userFlow = this.userFlows.get(userId) || {
        userId,
        userEmail,
        sessionIds: [],
        postsCreated: 0,
        quotaUsed: 0,
        quotaRemaining: 52 // Professional plan default
      };

      userFlow.subscriptionCreated = new Date();
      userFlow.subscriptionId = subscriptionId;
      userFlow.lastActivity = new Date();
      this.userFlows.set(userId, userFlow);
    }

    console.log(`📋 [SUBSCRIPTION] ${success ? '✅' : '❌'} User ${userId} (${userEmail}) - ${success ? 'Created' : 'Failed'} subscription ${subscriptionId}`);
  }

  // Log user login/session establishment
  logUserLogin(userId: number, userEmail: string, sessionId: string, success: boolean, details: any, error?: string) {
    const logEntry: LogEntry = {
      id: this.generateLogId(),
      timestamp: new Date(),
      userId,
      userEmail,
      sessionId,
      action: 'user_login',
      details,
      success,
      error
    };

    this.logs.push(logEntry);

    // Update user flow
    if (success) {
      const userFlow = this.userFlows.get(userId) || {
        userId,
        userEmail,
        sessionIds: [],
        postsCreated: 0,
        quotaUsed: 0,
        quotaRemaining: 52
      };

      userFlow.lastLogin = new Date();
      if (!userFlow.sessionIds.includes(sessionId)) {
        userFlow.sessionIds.push(sessionId);
      }
      userFlow.lastActivity = new Date();
      this.userFlows.set(userId, userFlow);
    }

    console.log(`📋 [LOGIN] ${success ? '✅' : '❌'} User ${userId} (${userEmail}) - Session ${sessionId}`);
  }

  // Log subscription validation
  logSubscriptionValidation(userId: number, userEmail: string, subscriptionId: string, isActive: boolean, details: any) {
    const logEntry: LogEntry = {
      id: this.generateLogId(),
      timestamp: new Date(),
      userId,
      userEmail,
      subscriptionId,
      action: 'subscription_validation',
      details,
      success: isActive
    };

    this.logs.push(logEntry);
    console.log(`📋 [VALIDATION] ${isActive ? '✅' : '❌'} User ${userId} - Subscription ${subscriptionId} ${isActive ? 'Active' : 'Inactive'}`);
  }

  // Log duplicate prevention
  logDuplicatePrevention(userId: number, userEmail: string, existingSubscriptionId: string, attemptedSubscriptionId: string, prevented: boolean, details: any) {
    const logEntry: LogEntry = {
      id: this.generateLogId(),
      timestamp: new Date(),
      userId,
      userEmail,
      subscriptionId: existingSubscriptionId,
      action: 'duplicate_prevention',
      details: {
        ...details,
        existingSubscriptionId,
        attemptedSubscriptionId,
        prevented
      },
      success: prevented
    };

    this.logs.push(logEntry);
    console.log(`📋 [DUPLICATE] ${prevented ? '✅ BLOCKED' : '❌ ALLOWED'} User ${userId} - Attempted ${attemptedSubscriptionId}, Existing ${existingSubscriptionId}`);
  }

  // Log post creation attempt
  logPostCreation(userId: number, userEmail: string, sessionId: string, postId: number, platforms: string[], success: boolean, details: any, error?: string) {
    const logEntry: LogEntry = {
      id: this.generateLogId(),
      timestamp: new Date(),
      userId,
      userEmail,
      sessionId,
      action: 'post_creation',
      details: {
        ...details,
        postId,
        platforms
      },
      success,
      error
    };

    this.logs.push(logEntry);

    // Update user flow
    const userFlow = this.userFlows.get(userId);
    if (userFlow && success) {
      userFlow.postsCreated++;
      userFlow.quotaUsed++;
      userFlow.quotaRemaining = Math.max(0, userFlow.quotaRemaining - 1);
      userFlow.lastActivity = new Date();
      this.userFlows.set(userId, userFlow);
    }

    console.log(`📋 [POST] ${success ? '✅' : '❌'} User ${userId} - Post ${postId} to ${platforms.join(', ')}`);
  }

  // Log platform publishing
  logPlatformPublish(userId: number, userEmail: string, postId: number, platform: string, platformPostId: string | null, success: boolean, details: any, error?: string) {
    const logEntry: LogEntry = {
      id: this.generateLogId(),
      timestamp: new Date(),
      userId,
      userEmail,
      action: 'platform_publish',
      details: {
        ...details,
        postId,
        platform,
        platformPostId
      },
      success,
      error
    };

    this.logs.push(logEntry);
    console.log(`📋 [PUBLISH] ${success ? '✅' : '❌'} User ${userId} - Post ${postId} to ${platform} ${platformPostId ? `(ID: ${platformPostId})` : '(Failed)'}`);
  }

  // Log quota management
  logQuotaDeduction(userId: number, userEmail: string, postId: number, quotaBefore: number, quotaAfter: number, success: boolean, details: any) {
    const logEntry: LogEntry = {
      id: this.generateLogId(),
      timestamp: new Date(),
      userId,
      userEmail,
      action: 'quota_deduction',
      details: {
        ...details,
        postId,
        quotaBefore,
        quotaAfter
      },
      success
    };

    this.logs.push(logEntry);

    // Update user flow
    const userFlow = this.userFlows.get(userId);
    if (userFlow && success) {
      userFlow.quotaUsed = quotaBefore - quotaAfter;
      userFlow.quotaRemaining = quotaAfter;
      userFlow.lastActivity = new Date();
      this.userFlows.set(userId, userFlow);
    }

    console.log(`📋 [QUOTA] ${success ? '✅' : '❌'} User ${userId} - Post ${postId} quota: ${quotaBefore} → ${quotaAfter}`);
  }

  // Get user flow history
  getUserFlow(userId: number): UserFlow | undefined {
    return this.userFlows.get(userId);
  }

  // Get all user flows
  getAllUserFlows(): UserFlow[] {
    return Array.from(this.userFlows.values());
  }

  // Get logs for user
  getUserLogs(userId: number, limit: number = 50): LogEntry[] {
    return this.logs
      .filter(log => log.userId === userId)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  // Get logs by action
  getLogsByAction(action: string, limit: number = 50): LogEntry[] {
    return this.logs
      .filter(log => log.action === action)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  // Get complete flow for debugging
  getCompleteFlow(userId: number): {
    userFlow: UserFlow | undefined;
    logs: LogEntry[];
    summary: {
      subscriptionActive: boolean;
      totalLogins: number;
      totalPosts: number;
      quotaUtilization: number;
      lastActivity: Date | undefined;
    };
  } {
    const userFlow = this.userFlows.get(userId);
    const logs = this.getUserLogs(userId, 100);
    
    const subscriptionLogs = logs.filter(log => log.action === 'subscription_creation' && log.success);
    const loginLogs = logs.filter(log => log.action === 'user_login' && log.success);
    const postLogs = logs.filter(log => log.action === 'post_creation' && log.success);

    return {
      userFlow,
      logs,
      summary: {
        subscriptionActive: subscriptionLogs.length > 0,
        totalLogins: loginLogs.length,
        totalPosts: postLogs.length,
        quotaUtilization: userFlow ? (userFlow.quotaUsed / (userFlow.quotaUsed + userFlow.quotaRemaining)) * 100 : 0,
        lastActivity: userFlow?.lastActivity
      }
    };
  }

  // Generate flow report
  generateFlowReport(): {
    totalUsers: number;
    activeSubscriptions: number;
    totalLogins: number;
    totalPosts: number;
    quotaUtilization: number;
    recentActivity: LogEntry[];
  } {
    const allFlows = this.getAllUserFlows();
    const recentLogs = this.logs
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, 20);

    const totalQuotaUsed = allFlows.reduce((sum, flow) => sum + flow.quotaUsed, 0);
    const totalQuotaAvailable = allFlows.reduce((sum, flow) => sum + flow.quotaUsed + flow.quotaRemaining, 0);

    return {
      totalUsers: allFlows.length,
      activeSubscriptions: allFlows.filter(flow => flow.subscriptionId).length,
      totalLogins: allFlows.reduce((sum, flow) => sum + flow.sessionIds.length, 0),
      totalPosts: allFlows.reduce((sum, flow) => sum + flow.postsCreated, 0),
      quotaUtilization: totalQuotaAvailable > 0 ? (totalQuotaUsed / totalQuotaAvailable) * 100 : 0,
      recentActivity: recentLogs
    };
  }

  // Clear old logs (retain last 1000 entries)
  cleanupLogs() {
    if (this.logs.length > 1000) {
      this.logs = this.logs
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
        .slice(0, 1000);
      console.log('📋 [CLEANUP] Retained 1000 most recent log entries');
    }
  }
}

// Export singleton instance
export const loggingService = new LoggingService();
export type { LogEntry, UserFlow };