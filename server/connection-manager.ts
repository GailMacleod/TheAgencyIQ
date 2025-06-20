/**
 * Automatic Connection Manager
 * Silently manages platform connections for 30-day posting cycles
 * Only redirects users to reconnect when absolutely necessary
 */

import { db } from './db';
import { platformConnections, posts } from '../shared/schema';
import { eq, and, sql } from 'drizzle-orm';

export class ConnectionManager {
  
  /**
   * Check and maintain all platform connections silently
   * Returns true if all connections are healthy, false if user action needed
   */
  static async ensureConnections(userId: number): Promise<{
    allHealthy: boolean;
    needsReconnection: string[];
    redirectTo?: string;
  }> {
    const connections = await db.select()
      .from(platformConnections)
      .where(eq(platformConnections.userId, userId));
    
    const needsReconnection: string[] = [];
    
    for (const connection of connections) {
      const isHealthy = await this.validateConnection(connection);
      
      if (!isHealthy) {
        needsReconnection.push(connection.platform);
        
        // Mark connection as inactive
        await db.update(platformConnections)
          .set({ 
            isActive: false
          })
          .where(eq(platformConnections.id, connection.id));
      } else {
        // Mark connection as healthy
        await db.update(platformConnections)
          .set({ 
            isActive: true
          })
          .where(eq(platformConnections.id, connection.id));
      }
    }
    
    const result = {
      allHealthy: needsReconnection.length === 0,
      needsReconnection,
      redirectTo: needsReconnection.length > 0 ? '/connect-platforms' : undefined
    };
    
    // If connections need repair, update posts with friendly message
    if (needsReconnection.length > 0) {
      await this.updatePostsForReconnection(userId, needsReconnection);
    }
    
    return result;
  }
  
  /**
   * Validate a single platform connection
   */
  private static async validateConnection(connection: any): Promise<boolean> {
    const { platform, accessToken } = connection;
    
    // Quick check for obviously invalid tokens (demo/mock tokens)
    if (!accessToken || 
        accessToken.includes('demo') || 
        accessToken.includes('valid_') || 
        accessToken.length < 30) {
      return false;
    }
    
    // If token looks valid, assume it's good for 30 days
    // Real validation would happen during actual posting attempts
    return true;
  }
  
  /**
   * Update posts with user-friendly reconnection message
   */
  private static async updatePostsForReconnection(userId: number, platforms: string[]): Promise<void> {
    const platformList = platforms.join(', ');
    const message = `Please reconnect your ${platformList} account${platforms.length > 1 ? 's' : ''} to continue posting`;
    
    await db.execute(sql`
      UPDATE posts 
      SET error_log = ${message},
          status = CASE 
            WHEN status = 'approved' THEN 'pending_connection'
            ELSE status 
          END
      WHERE user_id = ${userId} 
      AND platform = ANY(${platforms})
      AND status IN ('approved', 'draft', 'failed')
    `);
  }
  
  /**
   * Check if user needs to reconnect platforms before accessing schedule
   */
  static async checkConnectionsBeforeSchedule(userId: number): Promise<{
    canProceed: boolean;
    redirectTo?: string;
    message?: string;
  }> {
    const status = await this.ensureConnections(userId);
    
    if (!status.allHealthy) {
      return {
        canProceed: false,
        redirectTo: '/connect-platforms',
        message: `Please reconnect your ${status.needsReconnection.join(', ')} account${status.needsReconnection.length > 1 ? 's' : ''} to continue your 30-day posting schedule`
      };
    }
    
    return { canProceed: true };
  }
  
  /**
   * Schedule background connection health checks
   */
  static async scheduleHealthChecks(): Promise<void> {
    // Check all user connections every 6 hours
    setInterval(async () => {
      try {
        const result = await db.execute(sql`
          SELECT DISTINCT user_id FROM platform_connections 
          WHERE is_active = true
        `);
        
        for (const user of result.rows) {
          await this.ensureConnections((user as any).user_id);
        }
      } catch (error) {
        console.error('Background connection check failed:', error);
      }
    }, 6 * 60 * 60 * 1000); // 6 hours
  }
  
  /**
   * Get connection status for posting system
   */
  static async getConnectionStatus(userId: number, platform: string): Promise<{
    isConnected: boolean;
    needsReauth: boolean;
    lastChecked?: Date;
  }> {
    const [connection] = await db.select()
      .from(platformConnections)
      .where(and(
        eq(platformConnections.userId, userId),
        eq(platformConnections.platform, platform)
      ));
    
    if (!connection) {
      return { isConnected: false, needsReauth: true };
    }
    
    const isValid = await this.validateConnection(connection);
    
    return {
      isConnected: isValid,
      needsReauth: !isValid,
      lastChecked: connection.connectedAt
    };
  }
}