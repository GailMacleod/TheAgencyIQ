/**
 * Connection Status Monitor
 * Seamlessly monitors platform connections and guides users to reconnect when needed
 * Users never see OAuth technical details - just simple "Connect Account" buttons
 */

import { db } from "./db";
import { platformConnections, posts } from "@shared/schema";
import { eq, and, inArray } from "drizzle-orm";

interface ConnectionStatus {
  platform: string;
  connected: boolean;
  needsReconnection: boolean;
  displayName: string;
  icon: string;
  description: string;
}

export class ConnectionStatusMonitor {
  
  /**
   * Get user-friendly connection status for all platforms
   */
  static async getConnectionStatus(userId: number): Promise<{
    connectedPlatforms: ConnectionStatus[];
    disconnectedPlatforms: ConnectionStatus[];
    needsAttention: boolean;
    totalConnected: number;
    message: string;
  }> {
    const connections = await db.select()
      .from(platformConnections)
      .where(eq(platformConnections.userId, userId));
    
    const platformConfigs = [
      {
        key: 'facebook',
        displayName: 'Facebook',
        icon: '📘',
        description: 'Share engaging posts to your Facebook page'
      },
      {
        key: 'instagram',
        displayName: 'Instagram',
        icon: '📷',
        description: 'Post beautiful visual content to Instagram'
      },
      {
        key: 'x',
        displayName: 'X (Twitter)',
        icon: '𝕏',
        description: 'Share quick updates and engage conversations'
      },
      {
        key: 'linkedin',
        displayName: 'LinkedIn',
        icon: '💼',
        description: 'Professional networking and business content'
      },
      {
        key: 'youtube',
        displayName: 'YouTube',
        icon: '🎥',
        description: 'Share video content and community posts'
      }
    ];
    
    const connectedPlatforms: ConnectionStatus[] = [];
    const disconnectedPlatforms: ConnectionStatus[] = [];
    
    for (const config of platformConfigs) {
      const connection = connections.find(c => c.platform.toLowerCase() === config.key);
      
      const isConnected = connection && 
        connection.isActive === true &&
        this.isValidToken(connection.accessToken || '');
      
      const status: ConnectionStatus = {
        platform: config.key,
        connected: isConnected,
        needsReconnection: !isConnected,
        displayName: config.displayName,
        icon: config.icon,
        description: config.description
      };
      
      if (isConnected) {
        connectedPlatforms.push(status);
      } else {
        disconnectedPlatforms.push(status);
      }
    }
    
    const needsAttention = disconnectedPlatforms.length > 0;
    const message = needsAttention 
      ? `Connect ${disconnectedPlatforms.length} more platform${disconnectedPlatforms.length > 1 ? 's' : ''} to maximize your reach`
      : 'All platforms connected and ready to go!';
    
    return {
      connectedPlatforms,
      disconnectedPlatforms,
      needsAttention,
      totalConnected: connectedPlatforms.length,
      message
    };
  }
  
  /**
   * Check if user can proceed with scheduling (has at least one platform)
   */
  static async canProceedWithScheduling(userId: number): Promise<{
    canProceed: boolean;
    connectedCount: number;
    message: string;
    suggestedAction?: string;
  }> {
    const status = await this.getConnectionStatus(userId);
    
    if (status.totalConnected === 0) {
      return {
        canProceed: false,
        connectedCount: 0,
        message: "Connect at least one social media account to start creating posts",
        suggestedAction: "connect_platforms"
      };
    }
    
    if (status.totalConnected < 3) {
      return {
        canProceed: true,
        connectedCount: status.totalConnected,
        message: `Ready to create posts for ${status.totalConnected} platform${status.totalConnected > 1 ? 's' : ''}. Connect more to increase your reach!`
      };
    }
    
    return {
      canProceed: true,
      connectedCount: status.totalConnected,
      message: `All systems ready! Connected to ${status.totalConnected} platforms`
    };
  }
  
  /**
   * Update posts that are waiting for disconnected platforms
   */
  static async updatePostsForDisconnectedPlatforms(userId: number): Promise<void> {
    const status = await this.getConnectionStatus(userId);
    const disconnectedPlatforms = status.disconnectedPlatforms.map(p => p.platform);
    
    if (disconnectedPlatforms.length > 0) {
      await db.update(posts)
        .set({ 
          status: 'pending_connection',
          errorLog: 'Platform connection needed - please reconnect your account'
        })
        .where(
          and(
            eq(posts.userId, userId),
            inArray(posts.platform, disconnectedPlatforms),
            inArray(posts.status, ['approved', 'draft', 'scheduled'])
          )
        );
    }
  }
  
  /**
   * Get platforms that need reconnection for display
   */
  static async getPlatformsNeedingReconnection(userId: number): Promise<string[]> {
    const status = await this.getConnectionStatus(userId);
    return status.disconnectedPlatforms.map(p => p.displayName);
  }
  
  /**
   * Check if a token is valid (not a demo/test token)
   */
  private static isValidToken(accessToken: string): boolean {
    if (!accessToken || accessToken.length < 20) return false;
    
    const invalidPatterns = [
      'demo',
      '_token_',
      'test_',
      'placeholder',
      'invalid',
      'expired'
    ];
    
    return !invalidPatterns.some(pattern => 
      accessToken.toLowerCase().includes(pattern)
    );
  }
  
  /**
   * Get connection summary for dashboard
   */
  static async getConnectionSummary(userId: number): Promise<{
    total: number;
    connected: number;
    needingReconnection: number;
    platforms: { [key: string]: boolean };
  }> {
    const status = await this.getConnectionStatus(userId);
    
    const platforms: { [key: string]: boolean } = {};
    [...status.connectedPlatforms, ...status.disconnectedPlatforms].forEach(p => {
      platforms[p.platform] = p.connected;
    });
    
    return {
      total: status.connectedPlatforms.length + status.disconnectedPlatforms.length,
      connected: status.connectedPlatforms.length,
      needingReconnection: status.disconnectedPlatforms.length,
      platforms
    };
  }
}