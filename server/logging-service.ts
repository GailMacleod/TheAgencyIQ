/**
 * LOGGING SERVICE - Comprehensive User Journey Tracking
 * Tracks complete chain: User ID → Subscription → Sessions → Posts → Quota/Analytics
 * Provides audit trail for all user interactions and system operations
 */

import { writeFile, appendFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';

interface LogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  category: string;
  message: string;
  userId?: number;
  sessionId?: string;
  postId?: number;
  platform?: string;
  data?: any;
}

interface UserJourneyLog {
  userId: number;
  sessionId: string;
  action: string;
  page?: string;
  platform?: string;
  postId?: number;
  quotaUsed?: number;
  quotaRemaining?: number;
  subscriptionPlan?: string;
  platformPostId?: string;
  error?: string;
  timestamp: string;
  data?: any;
}

interface SessionTrackingLog {
  sessionId: string;
  userId: number;
  action: 'established' | 'restored' | 'expired' | 'invalidated';
  userEmail: string;
  subscriptionPlan: string;
  subscriptionActive: boolean;
  cookies: string[];
  headers: any;
  timestamp: string;
}

interface PublishingLog {
  userId: number;
  postId: number;
  platform: string;
  action: 'attempt' | 'success' | 'failure' | 'quota_deducted' | 'rolled_back';
  platformPostId?: string;
  quotaUsed?: number;
  quotaRemaining?: number;
  error?: string;
  sessionId?: string;
  timestamp: string;
}

export class LoggingService {
  private logDir = './data';
  private journeyLogFile = join(this.logDir, 'user-journey.log');
  private sessionLogFile = join(this.logDir, 'session-tracking.log');
  private publishingLogFile = join(this.logDir, 'publishing.log');
  private quotaDebugFile = join(this.logDir, 'quota-debug.log');
  private generalLogFile = join(this.logDir, 'system.log');

  constructor() {
    this.ensureLogDirectory();
  }

  private async ensureLogDirectory(): Promise<void> {
    try {
      const { mkdir } = await import('fs/promises');
      await mkdir(this.logDir, { recursive: true });
    } catch (error) {
      console.error('Failed to create log directory:', error);
    }
  }

  private formatLogEntry(entry: LogEntry): string {
    const dataStr = entry.data ? ` | Data: ${JSON.stringify(entry.data)}` : '';
    return `[${entry.timestamp}] [${entry.level.toUpperCase()}] [${entry.category}] ${entry.message}${dataStr}\n`;
  }

  // GENERAL LOGGING
  async log(level: 'info' | 'warn' | 'error' | 'debug', category: string, message: string, data?: any): Promise<void> {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      category,
      message,
      data
    };

    const logLine = this.formatLogEntry(entry);
    
    try {
      await appendFile(this.generalLogFile, logLine);
      if (level === 'error') {
        console.error(`[LoggingService] ${category}: ${message}`, data);
      } else if (level === 'warn') {
        console.warn(`[LoggingService] ${category}: ${message}`, data);
      } else {
        console.log(`[LoggingService] ${category}: ${message}`, data);
      }
    } catch (error) {
      console.error('Failed to write to general log:', error);
    }
  }

  // USER JOURNEY TRACKING
  async logUserJourney(journey: Omit<UserJourneyLog, 'timestamp'>): Promise<void> {
    const entry: UserJourneyLog = {
      ...journey,
      timestamp: new Date().toISOString()
    };

    const logLine = `${entry.timestamp} | User:${entry.userId} | Session:${entry.sessionId} | Action:${entry.action} | Page:${entry.page || 'N/A'} | Platform:${entry.platform || 'N/A'} | Post:${entry.postId || 'N/A'} | Quota:${entry.quotaUsed || 0}/${entry.quotaRemaining || 0} | Plan:${entry.subscriptionPlan || 'N/A'} | PlatformPost:${entry.platformPostId || 'N/A'} | Error:${entry.error || 'N/A'}\n`;

    try {
      await appendFile(this.journeyLogFile, logLine);
      console.log(`[UserJourney] User ${entry.userId}: ${entry.action} on ${entry.page || 'unknown'}`);
    } catch (error) {
      console.error('Failed to write to user journey log:', error);
    }
  }

  // SESSION TRACKING
  async logSessionActivity(session: Omit<SessionTrackingLog, 'timestamp'>): Promise<void> {
    const entry: SessionTrackingLog = {
      ...session,
      timestamp: new Date().toISOString()
    };

    const logLine = `${entry.timestamp} | Session:${entry.sessionId} | User:${entry.userId} | Action:${entry.action} | Email:${entry.userEmail} | Plan:${entry.subscriptionPlan} | Active:${entry.subscriptionActive} | Cookies:${entry.cookies.length}\n`;

    try {
      await appendFile(this.sessionLogFile, logLine);
      console.log(`[SessionTracking] Session ${entry.sessionId}: ${entry.action} for User ${entry.userId}`);
    } catch (error) {
      console.error('Failed to write to session tracking log:', error);
    }
  }

  // PUBLISHING TRACKING
  async logPublishingActivity(publishing: Omit<PublishingLog, 'timestamp'>): Promise<void> {
    const entry: PublishingLog = {
      ...publishing,
      timestamp: new Date().toISOString()
    };

    const logLine = `${entry.timestamp} | User:${entry.userId} | Post:${entry.postId} | Platform:${entry.platform} | Action:${entry.action} | PlatformPost:${entry.platformPostId || 'N/A'} | Quota:${entry.quotaUsed || 0}/${entry.quotaRemaining || 0} | Error:${entry.error || 'N/A'} | Session:${entry.sessionId || 'N/A'}\n`;

    try {
      await appendFile(this.publishingLogFile, logLine);
      console.log(`[Publishing] User ${entry.userId}: ${entry.action} on ${entry.platform} for post ${entry.postId}`);
    } catch (error) {
      console.error('Failed to write to publishing log:', error);
    }
  }

  // QUOTA DEBUG LOGGING
  async logQuotaDebug(message: string, data?: any): Promise<void> {
    const timestamp = new Date().toISOString();
    const logLine = `${timestamp} | ${message} | ${data ? JSON.stringify(data) : 'N/A'}\n`;

    try {
      await appendFile(this.quotaDebugFile, logLine);
      console.log(`[QuotaDebug] ${message}`, data);
    } catch (error) {
      console.error('Failed to write to quota debug log:', error);
    }
  }

  // SPECIALIZED LOGGING METHODS
  async logSignup(userId: number, email: string, phone: string, sessionId: string): Promise<void> {
    await this.logUserJourney({
      userId,
      sessionId,
      action: 'signup',
      page: 'signup',
      data: { email, phone }
    });
  }

  async logLogin(userId: number, email: string, sessionId: string): Promise<void> {
    await this.logUserJourney({
      userId,
      sessionId,
      action: 'login',
      page: 'login',
      data: { email }
    });
  }

  async logSubscriptionCreated(userId: number, sessionId: string, plan: string, stripeCustomerId: string): Promise<void> {
    await this.logUserJourney({
      userId,
      sessionId,
      action: 'subscription_created',
      page: 'subscription',
      subscriptionPlan: plan,
      data: { stripeCustomerId }
    });
  }

  async logPageNavigation(userId: number, sessionId: string, page: string, data?: any): Promise<void> {
    await this.logUserJourney({
      userId,
      sessionId,
      action: 'page_navigation',
      page,
      data
    });
  }

  async logPostCreation(userId: number, sessionId: string, postId: number, platforms: string[], content: string): Promise<void> {
    await this.logUserJourney({
      userId,
      sessionId,
      action: 'post_created',
      page: 'post-creation',
      postId,
      data: { platforms, content: content.substring(0, 100) }
    });
  }

  async logPublishAttempt(params: {
    userId: number;
    postId: number;
    platforms: string[];
    sessionId?: string;
    content: string;
  }): Promise<void> {
    await this.logPublishingActivity({
      userId: params.userId,
      postId: params.postId,
      platform: params.platforms.join(','),
      action: 'attempt',
      sessionId: params.sessionId,
      data: { content: params.content }
    });
  }

  async logPlatformPublish(params: {
    userId: number;
    postId: number;
    platform: string;
    success: boolean;
    platformPostId?: string;
    error?: string;
    sessionId?: string;
  }): Promise<void> {
    await this.logPublishingActivity({
      userId: params.userId,
      postId: params.postId,
      platform: params.platform,
      action: params.success ? 'success' : 'failure',
      platformPostId: params.platformPostId,
      error: params.error,
      sessionId: params.sessionId
    });
  }

  async logPublishSummary(params: {
    userId: number;
    postId: number;
    totalPlatforms: number;
    successCount: number;
    failureCount: number;
    sessionId?: string;
  }): Promise<void> {
    await this.logUserJourney({
      userId: params.userId,
      sessionId: params.sessionId || 'unknown',
      action: 'publish_summary',
      page: 'publishing',
      postId: params.postId,
      data: {
        totalPlatforms: params.totalPlatforms,
        successCount: params.successCount,
        failureCount: params.failureCount
      }
    });
  }

  async logQuotaDeduction(userId: number, platform: string, postId: number, quotaUsed: number, quotaRemaining: number): Promise<void> {
    await this.logPublishingActivity({
      userId,
      postId,
      platform,
      action: 'quota_deducted',
      quotaUsed,
      quotaRemaining
    });

    await this.logQuotaDebug(`Quota deducted for User ${userId}`, {
      platform,
      postId,
      quotaUsed,
      quotaRemaining
    });
  }

  async logQuotaRollback(userId: number, platform: string, postId: number, reason: string): Promise<void> {
    await this.logPublishingActivity({
      userId,
      postId,
      platform,
      action: 'rolled_back',
      error: reason
    });

    await this.logQuotaDebug(`Quota rolled back for User ${userId}`, {
      platform,
      postId,
      reason
    });
  }

  // ANALYTICS LOGGING
  async logAnalyticsAccess(userId: number, sessionId: string, analyticsType: string, data?: any): Promise<void> {
    await this.logUserJourney({
      userId,
      sessionId,
      action: 'analytics_access',
      page: 'analytics',
      data: { analyticsType, ...data }
    });
  }

  // ERROR LOGGING
  async logError(category: string, message: string, error: any, userId?: number, sessionId?: string): Promise<void> {
    await this.log('error', category, message, {
      error: error.message || error,
      stack: error.stack,
      userId,
      sessionId
    });
  }

  // CLEANUP METHODS
  async clearOldLogs(daysToKeep: number = 30): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    await this.log('info', 'cleanup', `Clearing logs older than ${cutoffDate.toISOString()}`);
    
    // Implementation would filter log files by date
    // For now, just log the action
    console.log(`[LoggingService] Would clear logs older than ${cutoffDate.toISOString()}`);
  }

  async generateSummaryReport(userId?: number, startDate?: Date, endDate?: Date): Promise<any> {
    await this.log('info', 'reporting', 'Generating summary report', { userId, startDate, endDate });
    
    // Implementation would read log files and generate summary
    // For now, return placeholder
    return {
      userId,
      period: { start: startDate, end: endDate },
      summary: 'Report generation placeholder'
    };
  }
}

// Export singleton instance
export const loggingService = new LoggingService();