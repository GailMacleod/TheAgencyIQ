/**
 * PLATFORM HEALTH MONITOR
 * Comprehensive logging and monitoring system for platform connections and publishing attempts
 * Provides detailed insights into connection failures and success rates
 */

import { storage } from './storage';

interface ConnectionAttemptLog {
  userId: number;
  platform: string;
  timestamp: Date;
  connectionId: number;
  tokenStatus: 'valid' | 'expired' | 'invalid' | 'missing';
  connectionHealth: 'healthy' | 'degraded' | 'failed';
}

interface PublishAttemptLog {
  userId: number;
  platform: string;
  timestamp: Date;
  success: boolean;
  postId?: string;
  error?: string;
  responseTime?: number;
  retryAttempt?: number;
}

interface CriticalErrorLog {
  userId: number;
  platform: string;
  timestamp: Date;
  error: string;
  stackTrace?: string;
  context?: any;
}

export class PlatformHealthMonitor {
  private static connectionLogs: Map<string, ConnectionAttemptLog[]> = new Map();
  private static publishLogs: Map<string, PublishAttemptLog[]> = new Map();
  private static errorLogs: Map<string, CriticalErrorLog[]> = new Map();

  /**
   * Log connection attempt with detailed status
   */
  static async logConnectionAttempt(userId: number, platform: string, connection: any): Promise<void> {
    try {
      const logKey = `${userId}-${platform}`;
      
      const connectionLog: ConnectionAttemptLog = {
        userId,
        platform,
        timestamp: new Date(),
        connectionId: connection.id,
        tokenStatus: this.assessTokenStatus(connection),
        connectionHealth: await this.assessConnectionHealth(connection)
      };

      if (!this.connectionLogs.has(logKey)) {
        this.connectionLogs.set(logKey, []);
      }
      
      const logs = this.connectionLogs.get(logKey)!;
      logs.push(connectionLog);
      
      // Keep only last 50 logs per platform
      if (logs.length > 50) {
        logs.splice(0, logs.length - 50);
      }

      console.log(`🔍 HEALTH MONITOR: Connection attempt - ${platform} for user ${userId}`);
      console.log(`   Token Status: ${connectionLog.tokenStatus}`);
      console.log(`   Health Status: ${connectionLog.connectionHealth}`);
      
    } catch (error) {
      console.error('Failed to log connection attempt:', error);
    }
  }

  /**
   * Log successful publish with performance metrics
   */
  static async logPublishSuccess(userId: number, platform: string, postId?: string): Promise<void> {
    try {
      const logKey = `${userId}-${platform}`;
      
      const publishLog: PublishAttemptLog = {
        userId,
        platform,
        timestamp: new Date(),
        success: true,
        postId,
        responseTime: Date.now() // Could be enhanced with actual response time
      };

      if (!this.publishLogs.has(logKey)) {
        this.publishLogs.set(logKey, []);
      }
      
      const logs = this.publishLogs.get(logKey)!;
      logs.push(publishLog);
      
      // Keep only last 100 publish logs per platform
      if (logs.length > 100) {
        logs.splice(0, logs.length - 100);
      }

      console.log(`✅ HEALTH MONITOR: Successful publish - ${platform} for user ${userId}`);
      if (postId) console.log(`   Post ID: ${postId}`);
      
    } catch (error) {
      console.error('Failed to log publish success:', error);
    }
  }

  /**
   * Log publish failure with detailed error information
   */
  static async logPublishFailure(userId: number, platform: string, error: string, context?: any): Promise<void> {
    try {
      const logKey = `${userId}-${platform}`;
      
      const publishLog: PublishAttemptLog = {
        userId,
        platform,
        timestamp: new Date(),
        success: false,
        error,
        retryAttempt: context?.retryAttempt || 0
      };

      if (!this.publishLogs.has(logKey)) {
        this.publishLogs.set(logKey, []);
      }
      
      const logs = this.publishLogs.get(logKey)!;
      logs.push(publishLog);
      
      // Keep only last 100 publish logs per platform
      if (logs.length > 100) {
        logs.splice(0, logs.length - 100);
      }

      console.log(`❌ HEALTH MONITOR: Failed publish - ${platform} for user ${userId}`);
      console.log(`   Error: ${error}`);
      if (context?.retryAttempt) console.log(`   Retry Attempt: ${context.retryAttempt}`);
      
    } catch (error) {
      console.error('Failed to log publish failure:', error);
    }
  }

  /**
   * Log critical system errors
   */
  static async logCriticalError(userId: number, platform: string, error: string, stackTrace?: string): Promise<void> {
    try {
      const logKey = `${userId}-${platform}`;
      
      const errorLog: CriticalErrorLog = {
        userId,
        platform,
        timestamp: new Date(),
        error,
        stackTrace
      };

      if (!this.errorLogs.has(logKey)) {
        this.errorLogs.set(logKey, []);
      }
      
      const logs = this.errorLogs.get(logKey)!;
      logs.push(errorLog);
      
      // Keep only last 25 critical errors per platform
      if (logs.length > 25) {
        logs.splice(0, logs.length - 25);
      }

      console.log(`🚨 HEALTH MONITOR: Critical error - ${platform} for user ${userId}`);
      console.log(`   Error: ${error}`);
      if (stackTrace) console.log(`   Stack: ${stackTrace.substring(0, 200)}...`);
      
    } catch (error) {
      console.error('Failed to log critical error:', error);
    }
  }

  /**
   * Get platform health summary for user
   */
  static getPlatformHealthSummary(userId: number, platform: string): any {
    const logKey = `${userId}-${platform}`;
    const publishLogs = this.publishLogs.get(logKey) || [];
    const connectionLogs = this.connectionLogs.get(logKey) || [];
    const errorLogs = this.errorLogs.get(logKey) || [];

    const recentPublishes = publishLogs.filter(log => 
      Date.now() - log.timestamp.getTime() < 24 * 60 * 60 * 1000 // Last 24 hours
    );

    const successfulPublishes = recentPublishes.filter(log => log.success);
    const failedPublishes = recentPublishes.filter(log => !log.success);

    return {
      platform,
      healthScore: recentPublishes.length > 0 ? 
        (successfulPublishes.length / recentPublishes.length) * 100 : 100,
      totalAttempts: recentPublishes.length,
      successfulAttempts: successfulPublishes.length,
      failedAttempts: failedPublishes.length,
      lastConnectionAttempt: connectionLogs[connectionLogs.length - 1]?.timestamp,
      lastSuccessfulPublish: successfulPublishes[successfulPublishes.length - 1]?.timestamp,
      recentErrors: errorLogs.slice(-5).map(log => ({
        timestamp: log.timestamp,
        error: log.error
      }))
    };
  }

  /**
   * Assess token status from connection object
   */
  private static assessTokenStatus(connection: any): 'valid' | 'expired' | 'invalid' | 'missing' {
    if (!connection.accessToken) return 'missing';
    
    if (connection.expiresAt) {
      const now = new Date();
      const expiryDate = new Date(connection.expiresAt);
      if (now >= expiryDate) return 'expired';
    }
    
    if (connection.accessToken.includes('demo_') || 
        connection.accessToken.includes('mock_') ||
        connection.accessToken.includes('test_')) {
      return 'invalid';
    }
    
    return 'valid';
  }

  /**
   * Assess overall connection health
   */
  private static async assessConnectionHealth(connection: any): Promise<'healthy' | 'degraded' | 'failed'> {
    try {
      // Check if connection has all required fields
      if (!connection.accessToken || !connection.isActive) {
        return 'failed';
      }

      // Check token expiry
      if (connection.expiresAt && new Date(connection.expiresAt) <= new Date()) {
        return 'degraded';
      }

      // Check for test/demo tokens
      if (connection.accessToken.includes('demo_') || 
          connection.accessToken.includes('mock_')) {
        return 'degraded';
      }

      return 'healthy';
    } catch (error) {
      return 'failed';
    }
  }

  /**
   * Get comprehensive health report for all platforms
   */
  static getOverallHealthReport(userId: number): any {
    const platforms = ['facebook', 'instagram', 'linkedin', 'x', 'youtube'];
    const healthReport = {
      userId,
      timestamp: new Date(),
      platforms: {} as any,
      overallHealth: 0
    };

    let totalHealthScore = 0;
    let activePlatforms = 0;

    platforms.forEach(platform => {
      const summary = this.getPlatformHealthSummary(userId, platform);
      healthReport.platforms[platform] = summary;
      
      if (summary.totalAttempts > 0) {
        totalHealthScore += summary.healthScore;
        activePlatforms++;
      }
    });

    healthReport.overallHealth = activePlatforms > 0 ? 
      Math.round(totalHealthScore / activePlatforms) : 100;

    return healthReport;
  }

  /**
   * Clear old logs to prevent memory issues
   */
  static clearOldLogs(): void {
    const cutoffTime = Date.now() - (7 * 24 * 60 * 60 * 1000); // 7 days ago

    this.connectionLogs.forEach((logs, key) => {
      const filteredLogs = logs.filter(log => log.timestamp.getTime() > cutoffTime);
      if (filteredLogs.length !== logs.length) {
        this.connectionLogs.set(key, filteredLogs);
      }
    });

    this.publishLogs.forEach((logs, key) => {
      const filteredLogs = logs.filter(log => log.timestamp.getTime() > cutoffTime);
      if (filteredLogs.length !== logs.length) {
        this.publishLogs.set(key, filteredLogs);
      }
    });

    this.errorLogs.forEach((logs, key) => {
      const filteredLogs = logs.filter(log => log.timestamp.getTime() > cutoffTime);
      if (filteredLogs.length !== logs.length) {
        this.errorLogs.set(key, filteredLogs);
      }
    });

    console.log('🧹 Health Monitor: Old logs cleared');
  }
}