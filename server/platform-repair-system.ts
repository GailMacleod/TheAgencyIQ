/**
 * Platform Connection Repair System
 * Automatically fixes X, YouTube, and LinkedIn connections
 * Handles token refresh and OAuth re-authentication
 */

import { db } from "./db";
import { platformConnections, users } from "@shared/schema";
import { eq, sql } from "drizzle-orm";
import { storage } from "./storage";

export class PlatformRepairSystem {
  
  /**
   * Repair all platform connections for a user
   */
  static async repairAllConnections(userId: number): Promise<{
    success: boolean;
    repaired: string[];
    failed: string[];
    message: string;
  }> {
    console.log(`🔧 Starting platform repair for user ${userId}`);
    
    const connections = await db.select()
      .from(platformConnections)
      .where(eq(platformConnections.userId, userId));
    
    const repaired: string[] = [];
    const failed: string[] = [];
    
    for (const connection of connections) {
      try {
        const result = await this.repairPlatformConnection(connection);
        if (result.success) {
          repaired.push(connection.platform);
          
          // Update connection as active
          await db.update(platformConnections)
            .set({ 
              isActive: true,
              accessToken: result.newToken || connection.accessToken,
              refreshToken: result.refreshToken || connection.refreshToken,
              expiresAt: result.expiresAt || connection.expiresAt
            })
            .where(eq(platformConnections.id, connection.id));
            
        } else {
          failed.push(connection.platform);
        }
      } catch (error) {
        console.error(`Failed to repair ${connection.platform}:`, error);
        failed.push(connection.platform);
      }
    }
    
    // Update all posts that were pending connection
    if (repaired.length > 0) {
      await this.updateRepairedPosts(userId, repaired);
    }
    
    return {
      success: repaired.length > 0,
      repaired,
      failed,
      message: repaired.length > 0 
        ? `Successfully repaired: ${repaired.join(', ')}`
        : failed.length > 0 
          ? `Failed to repair: ${failed.join(', ')}. Please reconnect manually.`
          : 'No connections found to repair'
    };
  }
  
  /**
   * Repair individual platform connection
   */
  private static async repairPlatformConnection(connection: any): Promise<{
    success: boolean;
    newToken?: string;
    refreshToken?: string;
    expiresAt?: Date;
    action: string;
  }> {
    const { platform } = connection;
    
    switch (platform.toLowerCase()) {
      case 'x':
      case 'twitter':
        return await this.repairXConnection(connection);
      case 'youtube':
        return await this.repairYouTubeConnection(connection);
      case 'linkedin':
        return await this.repairLinkedInConnection(connection);
      case 'facebook':
        return await this.repairFacebookConnection(connection);
      case 'instagram':
        return await this.repairInstagramConnection(connection);
      default:
        return { success: false, action: 'Unknown platform' };
    }
  }
  
  /**
   * Repair X (Twitter) connection
   */
  private static async repairXConnection(connection: any): Promise<{
    success: boolean;
    newToken?: string;
    refreshToken?: string;
    expiresAt?: Date;
    action: string;
  }> {
    try {
      // For X/Twitter, we need to use OAuth 2.0 with PKCE
      if (connection.refreshToken) {
        const response = await fetch('https://api.twitter.com/2/oauth2/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': `Basic ${Buffer.from(`${process.env.TWITTER_CLIENT_ID}:${process.env.TWITTER_CLIENT_SECRET}`).toString('base64')}`
          },
          body: new URLSearchParams({
            grant_type: 'refresh_token',
            refresh_token: connection.refreshToken,
            client_id: process.env.TWITTER_CLIENT_ID!
          })
        });
        
        if (response.ok) {
          const data = await response.json();
          return {
            success: true,
            newToken: data.access_token,
            refreshToken: data.refresh_token || connection.refreshToken,
            expiresAt: new Date(Date.now() + (data.expires_in * 1000)),
            action: 'Token refreshed successfully'
          };
        }
      }
      
      // If refresh fails, mark for manual reconnection
      return {
        success: false,
        action: 'Requires manual reconnection - please visit Connect Platforms'
      };
      
    } catch (error) {
      return {
        success: false,
        action: 'Connection repair failed - manual reconnection required'
      };
    }
  }
  
  /**
   * Repair YouTube connection
   */
  private static async repairYouTubeConnection(connection: any): Promise<{
    success: boolean;
    newToken?: string;
    refreshToken?: string;
    expiresAt?: Date;
    action: string;
  }> {
    try {
      // YouTube uses Google OAuth 2.0
      if (connection.refreshToken) {
        const response = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: new URLSearchParams({
            grant_type: 'refresh_token',
            refresh_token: connection.refreshToken,
            client_id: process.env.YOUTUBE_CLIENT_ID!,
            client_secret: process.env.YOUTUBE_CLIENT_SECRET!
          })
        });
        
        if (response.ok) {
          const data = await response.json();
          return {
            success: true,
            newToken: data.access_token,
            refreshToken: connection.refreshToken, // Google doesn't always return new refresh token
            expiresAt: new Date(Date.now() + (data.expires_in * 1000)),
            action: 'Token refreshed successfully'
          };
        }
      }
      
      return {
        success: false,
        action: 'Requires manual reconnection - please visit Connect Platforms'
      };
      
    } catch (error) {
      return {
        success: false,
        action: 'Connection repair failed - manual reconnection required'
      };
    }
  }
  
  /**
   * Repair LinkedIn connection
   */
  private static async repairLinkedInConnection(connection: any): Promise<{
    success: boolean;
    newToken?: string;
    refreshToken?: string;
    expiresAt?: Date;
    action: string;
  }> {
    try {
      // LinkedIn uses OAuth 2.0 with refresh tokens
      if (connection.refreshToken) {
        const response = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: new URLSearchParams({
            grant_type: 'refresh_token',
            refresh_token: connection.refreshToken,
            client_id: process.env.LINKEDIN_CLIENT_ID!,
            client_secret: process.env.LINKEDIN_CLIENT_SECRET!
          })
        });
        
        if (response.ok) {
          const data = await response.json();
          return {
            success: true,
            newToken: data.access_token,
            refreshToken: data.refresh_token || connection.refreshToken,
            expiresAt: new Date(Date.now() + (data.expires_in * 1000)),
            action: 'Token refreshed successfully'
          };
        }
      }
      
      return {
        success: false,
        action: 'Requires manual reconnection - please visit Connect Platforms'
      };
      
    } catch (error) {
      return {
        success: false,
        action: 'Connection repair failed - manual reconnection required'
      };
    }
  }
  
  /**
   * Repair Facebook connection
   */
  private static async repairFacebookConnection(connection: any): Promise<{
    success: boolean;
    newToken?: string;
    refreshToken?: string;
    expiresAt?: Date;
    action: string;
  }> {
    try {
      // Facebook uses long-lived access tokens
      const response = await fetch(`https://graph.facebook.com/oauth/access_token?grant_type=fb_exchange_token&client_id=${process.env.FACEBOOK_APP_ID}&client_secret=${process.env.FACEBOOK_APP_SECRET}&fb_exchange_token=${connection.accessToken}`);
      
      if (response.ok) {
        const data = await response.json();
        return {
          success: true,
          newToken: data.access_token,
          expiresAt: new Date(Date.now() + (data.expires_in * 1000)),
          action: 'Token extended successfully'
        };
      }
      
      return {
        success: false,
        action: 'Requires manual reconnection - please visit Connect Platforms'
      };
      
    } catch (error) {
      return {
        success: false,
        action: 'Connection repair failed - manual reconnection required'
      };
    }
  }
  
  /**
   * Repair Instagram connection (via Facebook)
   */
  private static async repairInstagramConnection(connection: any): Promise<{
    success: boolean;
    newToken?: string;
    refreshToken?: string;
    expiresAt?: Date;
    action: string;
  }> {
    // Instagram uses the same token refresh as Facebook
    return await this.repairFacebookConnection(connection);
  }
  
  /**
   * Update posts after successful connection repair
   */
  private static async updateRepairedPosts(userId: number, repairedPlatforms: string[]): Promise<void> {
    for (const platform of repairedPlatforms) {
      await db.execute(sql`
        UPDATE posts 
        SET error_log = NULL,
            status = CASE 
              WHEN status = 'pending_connection' THEN 'approved'
              ELSE status 
            END
        WHERE user_id = ${userId} 
        AND platform = ${platform}
        AND status IN ('pending_connection', 'failed')
      `);
    }
  }
  
  /**
   * Get repair status for all platforms
   */
  static async getRepairStatus(userId: number): Promise<{
    needsRepair: string[];
    healthy: string[];
    total: number;
  }> {
    const connections = await db.select()
      .from(platformConnections)
      .where(eq(platformConnections.userId, userId));
    
    const needsRepair: string[] = [];
    const healthy: string[] = [];
    
    for (const connection of connections) {
      // Check if token is obviously invalid (demo/mock tokens)
      const isInvalid = connection.accessToken.includes('demo') || 
                       connection.accessToken.includes('valid_') || 
                       connection.accessToken.length < 50 ||
                       !connection.isActive;
      
      if (isInvalid) {
        needsRepair.push(connection.platform);
      } else {
        healthy.push(connection.platform);
      }
    }
    
    return {
      needsRepair,
      healthy,
      total: connections.length
    };
  }
}