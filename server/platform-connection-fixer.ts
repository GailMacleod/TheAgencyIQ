/**
 * Platform Connection Fixer
 * Repairs X, YouTube, and LinkedIn connections by removing invalid tokens
 * and preparing for proper OAuth re-authentication
 */

import { db } from "./db";
import { platformConnections, posts } from "@shared/schema";
import { eq, and, sql } from "drizzle-orm";

export class PlatformConnectionFixer {
  
  /**
   * Fix all platform connections for X, YouTube, and LinkedIn
   */
  static async fixConnections(userId: number): Promise<{
    success: boolean;
    fixed: string[];
    removed: string[];
    message: string;
  }> {
    console.log(`🔧 Fixing platform connections for user ${userId}`);
    
    const connections = await db.select()
      .from(platformConnections)
      .where(eq(platformConnections.userId, userId));
    
    const fixed: string[] = [];
    const removed: string[] = [];
    
    // Process each connection
    for (const connection of connections) {
      const { platform, accessToken, id } = connection;
      
      // Check if token is invalid (demo/test tokens)
      const isInvalidToken = 
        accessToken.includes('demo') ||
        accessToken.includes('_token_') ||
        accessToken.includes('yt_token') ||
        accessToken.includes('li_token') ||
        accessToken.includes('x_token') ||
        accessToken.includes('valid_') ||
        accessToken.length < 50;
      
      if (isInvalidToken && ['x', 'youtube', 'linkedin'].includes(platform.toLowerCase())) {
        // Remove invalid connection
        await db.delete(platformConnections)
          .where(eq(platformConnections.id, id));
        
        removed.push(platform);
        console.log(`Removed invalid ${platform} connection with token: ${accessToken.substring(0, 20)}...`);
      } else if (['x', 'youtube', 'linkedin'].includes(platform.toLowerCase())) {
        // Mark valid connections as active
        await db.update(platformConnections)
          .set({ isActive: true })
          .where(eq(platformConnections.id, id));
        
        fixed.push(platform);
      }
    }
    
    // Update posts that were affected by invalid connections
    if (removed.length > 0) {
      await this.updatePostsForRemovedConnections(userId, removed);
    }
    
    // Activate posts for fixed connections
    if (fixed.length > 0) {
      await this.updatePostsForFixedConnections(userId, fixed);
    }
    
    return {
      success: true,
      fixed,
      removed,
      message: removed.length > 0 
        ? `Removed ${removed.length} invalid connections. Please reconnect: ${removed.join(', ')}`
        : `All platform connections are healthy`
    };
  }
  
  /**
   * Update posts for removed connections
   */
  private static async updatePostsForRemovedConnections(userId: number, removedPlatforms: string[]): Promise<void> {
    for (const platform of removedPlatforms) {
      await db.update(posts)
        .set({ 
          errorLog: `Please reconnect your ${platform.toUpperCase()} account to continue posting`,
          status: 'pending_connection'
        })
        .where(
          and(
            eq(posts.userId, userId),
            eq(posts.platform, platform),
            sql`status IN ('approved', 'draft', 'failed')`
          )
        );
    }
  }
  
  /**
   * Update posts for fixed connections
   */
  private static async updatePostsForFixedConnections(userId: number, fixedPlatforms: string[]): Promise<void> {
    for (const platform of fixedPlatforms) {
      await db.update(posts)
        .set({ 
          errorLog: null,
          status: 'approved'
        })
        .where(
          and(
            eq(posts.userId, userId),
            eq(posts.platform, platform),
            eq(posts.status, 'pending_connection')
          )
        );
    }
  }
  
  /**
   * Get connection status for specific platforms
   */
  static async getConnectionStatus(userId: number): Promise<{
    platforms: { [key: string]: boolean };
    needsReconnection: string[];
    totalConnections: number;
  }> {
    const connections = await db.select()
      .from(platformConnections)
      .where(eq(platformConnections.userId, userId));
    
    const platforms: { [key: string]: boolean } = {};
    const needsReconnection: string[] = [];
    
    // Check each target platform
    const targetPlatforms = ['x', 'youtube', 'linkedin', 'facebook', 'instagram'];
    
    for (const targetPlatform of targetPlatforms) {
      const connection = connections.find(c => c.platform.toLowerCase() === targetPlatform);
      
      if (!connection) {
        platforms[targetPlatform] = false;
        needsReconnection.push(targetPlatform);
      } else {
        const isValidToken = 
          !connection.accessToken.includes('demo') &&
          !connection.accessToken.includes('_token_') &&
          !connection.accessToken.includes('valid_') &&
          connection.accessToken.length >= 50 &&
          (connection.isActive === true);
        
        platforms[targetPlatform] = isValidToken;
        
        if (!isValidToken) {
          needsReconnection.push(targetPlatform);
        }
      }
    }
    
    return {
      platforms,
      needsReconnection,
      totalConnections: connections.length
    };
  }
  
  /**
   * Clean up duplicate connections for the same platform
   */
  static async cleanupDuplicateConnections(userId: number): Promise<{
    cleaned: number;
    kept: number;
  }> {
    const connections = await db.select()
      .from(platformConnections)
      .where(eq(platformConnections.userId, userId));
    
    const platformGroups: { [key: string]: any[] } = {};
    
    // Group connections by platform
    connections.forEach(conn => {
      const platform = conn.platform.toLowerCase();
      if (!platformGroups[platform]) {
        platformGroups[platform] = [];
      }
      platformGroups[platform].push(conn);
    });
    
    let cleaned = 0;
    let kept = 0;
    
    // For each platform, keep only the most recent valid connection
    for (const [platform, conns] of Object.entries(platformGroups)) {
      if (conns.length > 1) {
        // Sort by connection date (most recent first)
        conns.sort((a, b) => new Date(b.connectedAt || 0).getTime() - new Date(a.connectedAt || 0).getTime());
        
        // Keep the first (most recent) connection, remove the rest
        for (let i = 1; i < conns.length; i++) {
          await db.delete(platformConnections)
            .where(eq(platformConnections.id, conns[i].id));
          cleaned++;
        }
        kept++;
      } else {
        kept++;
      }
    }
    
    return { cleaned, kept };
  }
}