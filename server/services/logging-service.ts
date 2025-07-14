/**
 * COMPREHENSIVE LOGGING SERVICE
 * Provides full chain tracking from user ID through subscription, sessions, to posts
 * Enables complete audit trail and accountability for production deployment
 */

import { db } from "../db";
import { users, posts, platformConnections, postLedger } from "@shared/schema";
import { eq, and, desc, sql } from "drizzle-orm";

export interface LogContext {
  userId?: number;
  userEmail?: string;
  sessionId?: string;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  postId?: number;
  platformPostId?: string;
  platform?: string;
  action?: string;
  quotaUsed?: number;
  quotaRemaining?: number;
  timestamp?: Date;
  metadata?: any;
}

export interface AuditTrail {
  timestamp: Date;
  userId?: number;
  userEmail?: string;
  action: string;
  details: any;
  sessionId?: string;
  success: boolean;
  error?: string;
}

class LoggingService {
  private auditTrail: AuditTrail[] = [];

  /**
   * Log user authentication and session establishment
   */
  async logUserAuthentication(context: LogContext, success: boolean, error?: string) {
    const logEntry: AuditTrail = {
      timestamp: new Date(),
      userId: context.userId,
      userEmail: context.userEmail,
      sessionId: context.sessionId,
      action: 'user_authentication',
      details: {
        loginMethod: 'phone_password',
        sessionEstablished: success,
        metadata: context.metadata
      },
      success,
      error
    };

    this.auditTrail.push(logEntry);
    console.log(`🔐 AUTH LOG: User ${context.userId} (${context.userEmail}) - ${success ? 'SUCCESS' : 'FAILED'}`);
    
    if (error) {
      console.error(`❌ AUTH ERROR: ${error}`);
    }
  }

  /**
   * Log subscription creation and linking
   */
  async logSubscriptionCreation(context: LogContext, success: boolean, error?: string) {
    const logEntry: AuditTrail = {
      timestamp: new Date(),
      userId: context.userId,
      userEmail: context.userEmail,
      sessionId: context.sessionId,
      action: 'subscription_creation',
      details: {
        stripeCustomerId: context.stripeCustomerId,
        stripeSubscriptionId: context.stripeSubscriptionId,
        quotaAllocated: context.quotaUsed,
        cycle: '30_days',
        metadata: context.metadata
      },
      success,
      error
    };

    this.auditTrail.push(logEntry);
    console.log(`💳 SUBSCRIPTION LOG: User ${context.userId} - Stripe ${context.stripeSubscriptionId} - ${success ? 'CREATED' : 'FAILED'}`);
    
    if (error) {
      console.error(`❌ SUBSCRIPTION ERROR: ${error}`);
    }
  }

  /**
   * Log session persistence through navigation
   */
  async logSessionPersistence(context: LogContext, success: boolean, error?: string) {
    const logEntry: AuditTrail = {
      timestamp: new Date(),
      userId: context.userId,
      userEmail: context.userEmail,
      sessionId: context.sessionId,
      action: 'session_persistence',
      details: {
        navigationPath: context.action,
        sessionValid: success,
        metadata: context.metadata
      },
      success,
      error
    };

    this.auditTrail.push(logEntry);
    console.log(`🔄 SESSION LOG: User ${context.userId} - Session ${context.sessionId} - ${success ? 'PERSISTENT' : 'BROKEN'}`);
    
    if (error) {
      console.error(`❌ SESSION ERROR: ${error}`);
    }
  }

  /**
   * Log post creation and quota tracking
   */
  async logPostCreation(context: LogContext, success: boolean, error?: string) {
    const logEntry: AuditTrail = {
      timestamp: new Date(),
      userId: context.userId,
      userEmail: context.userEmail,
      sessionId: context.sessionId,
      action: 'post_creation',
      details: {
        postId: context.postId,
        platform: context.platform,
        quotaUsed: context.quotaUsed,
        quotaRemaining: context.quotaRemaining,
        metadata: context.metadata
      },
      success,
      error
    };

    this.auditTrail.push(logEntry);
    console.log(`📝 POST LOG: User ${context.userId} - Post ${context.postId} - ${success ? 'CREATED' : 'FAILED'}`);
    
    if (error) {
      console.error(`❌ POST ERROR: ${error}`);
    }
  }

  /**
   * Log platform publishing with real API integration
   */
  async logPlatformPublishing(context: LogContext, success: boolean, error?: string) {
    const logEntry: AuditTrail = {
      timestamp: new Date(),
      userId: context.userId,
      userEmail: context.userEmail,
      sessionId: context.sessionId,
      action: 'platform_publishing',
      details: {
        postId: context.postId,
        platform: context.platform,
        platformPostId: context.platformPostId,
        quotaDeducted: success,
        apiResponse: success ? 'success' : 'failed',
        metadata: context.metadata
      },
      success,
      error
    };

    this.auditTrail.push(logEntry);
    console.log(`🚀 PUBLISH LOG: User ${context.userId} - Platform ${context.platform} - Post ${context.platformPostId} - ${success ? 'PUBLISHED' : 'FAILED'}`);
    
    if (error) {
      console.error(`❌ PUBLISH ERROR: ${error}`);
    }
  }

  /**
   * Log quota deduction and rollback
   */
  async logQuotaManagement(context: LogContext, success: boolean, error?: string) {
    const logEntry: AuditTrail = {
      timestamp: new Date(),
      userId: context.userId,
      userEmail: context.userEmail,
      sessionId: context.sessionId,
      action: 'quota_management',
      details: {
        postId: context.postId,
        platform: context.platform,
        quotaUsed: context.quotaUsed,
        quotaRemaining: context.quotaRemaining,
        operation: context.action, // 'deduct' or 'rollback'
        metadata: context.metadata
      },
      success,
      error
    };

    this.auditTrail.push(logEntry);
    console.log(`📊 QUOTA LOG: User ${context.userId} - ${context.action} - Used: ${context.quotaUsed}, Remaining: ${context.quotaRemaining} - ${success ? 'SUCCESS' : 'FAILED'}`);
    
    if (error) {
      console.error(`❌ QUOTA ERROR: ${error}`);
    }
  }

  /**
   * Get comprehensive audit trail for a user
   */
  async getAuditTrail(userId: number): Promise<AuditTrail[]> {
    return this.auditTrail.filter(entry => entry.userId === userId);
  }

  /**
   * Get full chain accountability for a specific post
   */
  async getPostAccountability(postId: number): Promise<AuditTrail[]> {
    return this.auditTrail.filter(entry => entry.details?.postId === postId);
  }

  /**
   * Validate complete user journey chain
   */
  async validateUserJourneyChain(userId: number): Promise<{
    authentication: boolean;
    subscription: boolean;
    sessionPersistence: boolean;
    postCreation: boolean;
    platformPublishing: boolean;
    quotaManagement: boolean;
    complete: boolean;
  }> {
    const userTrail = await this.getAuditTrail(userId);
    
    return {
      authentication: userTrail.some(entry => entry.action === 'user_authentication' && entry.success),
      subscription: userTrail.some(entry => entry.action === 'subscription_creation' && entry.success),
      sessionPersistence: userTrail.some(entry => entry.action === 'session_persistence' && entry.success),
      postCreation: userTrail.some(entry => entry.action === 'post_creation' && entry.success),
      platformPublishing: userTrail.some(entry => entry.action === 'platform_publishing' && entry.success),
      quotaManagement: userTrail.some(entry => entry.action === 'quota_management' && entry.success),
      complete: userTrail.some(entry => entry.action === 'user_authentication' && entry.success) &&
                userTrail.some(entry => entry.action === 'subscription_creation' && entry.success) &&
                userTrail.some(entry => entry.action === 'session_persistence' && entry.success) &&
                userTrail.some(entry => entry.action === 'post_creation' && entry.success) &&
                userTrail.some(entry => entry.action === 'platform_publishing' && entry.success) &&
                userTrail.some(entry => entry.action === 'quota_management' && entry.success)
    };
  }

  /**
   * Generate comprehensive system health report
   */
  async generateSystemHealthReport(): Promise<{
    totalUsers: number;
    activeSubscriptions: number;
    postsPublished: number;
    quotaUtilization: number;
    errorRate: number;
    auditTrailEntries: number;
  }> {
    const totalEntries = this.auditTrail.length;
    const errorEntries = this.auditTrail.filter(entry => !entry.success).length;
    const uniqueUsers = new Set(this.auditTrail.map(entry => entry.userId)).size;
    const subscriptionEntries = this.auditTrail.filter(entry => entry.action === 'subscription_creation' && entry.success).length;
    const publishingEntries = this.auditTrail.filter(entry => entry.action === 'platform_publishing' && entry.success).length;

    return {
      totalUsers: uniqueUsers,
      activeSubscriptions: subscriptionEntries,
      postsPublished: publishingEntries,
      quotaUtilization: 0, // Calculate from database
      errorRate: totalEntries > 0 ? (errorEntries / totalEntries) * 100 : 0,
      auditTrailEntries: totalEntries
    };
  }

  /**
   * Clear audit trail (for testing purposes)
   */
  async clearAuditTrail() {
    this.auditTrail = [];
    console.log('🧹 AUDIT TRAIL CLEARED');
  }
}

export const loggingService = new LoggingService();