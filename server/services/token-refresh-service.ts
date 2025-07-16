/**
 * Token Refresh Service
 * Handles token validation and refresh for all platforms
 */

import { storage } from '../storage';
import { EnhancedTokenRefresh } from './enhanced-token-refresh';

export class TokenRefreshService {
  
  /**
   * Validate and refresh token before publishing
   */
  static async validateAndRefreshToken(userId: number, platform: string): Promise<boolean> {
    try {
      console.log(`🔄 Validating token for ${platform} (User ${userId})`);
      
      const connection = await storage.getPlatformConnection(userId, platform);
      if (!connection) {
        console.log(`❌ No connection found for ${platform}`);
        return false;
      }

      // Check if token is expired
      const now = new Date();
      const expiresAt = connection.expiresAt ? new Date(connection.expiresAt) : null;
      
      if (expiresAt && expiresAt <= now) {
        console.log(`⏰ Token expired for ${platform}, refreshing...`);
        const refreshResult = await EnhancedTokenRefresh.autoRefreshToken(userId, platform);
        
        if (refreshResult.success) {
          console.log(`✅ Token refreshed successfully for ${platform}`);
          return true;
        } else {
          console.log(`❌ Token refresh failed for ${platform}: ${refreshResult.error}`);
          return false;
        }
      }

      // Token is still valid
      console.log(`✅ Token is valid for ${platform}`);
      return true;
      
    } catch (error) {
      console.error(`❌ Token validation failed for ${platform}:`, error);
      return false;
    }
  }

  /**
   * Bulk validate and refresh tokens for multiple platforms
   */
  static async validateAndRefreshTokens(userId: number, platforms: string[]): Promise<{ [platform: string]: boolean }> {
    const results: { [platform: string]: boolean } = {};
    
    for (const platform of platforms) {
      results[platform] = await this.validateAndRefreshToken(userId, platform);
    }
    
    return results;
  }

  /**
   * Get valid token for platform (with auto-refresh)
   */
  static async getValidToken(userId: number, platform: string): Promise<string | null> {
    try {
      const isValid = await this.validateAndRefreshToken(userId, platform);
      
      if (isValid) {
        const connection = await storage.getPlatformConnection(userId, platform);
        return connection?.accessToken || null;
      }
      
      return null;
      
    } catch (error) {
      console.error(`❌ Failed to get valid token for ${platform}:`, error);
      return null;
    }
  }

  /**
   * Mock publish method for testing (to be replaced with real API calls)
   */
  static async publishToPlatform(platform: string, content: string, token: string): Promise<{ success: boolean; platformPostId?: string; error?: string }> {
    try {
      // For now, simulate successful publishing
      // In production, this would make real API calls to each platform
      const platformPostId = `${platform}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      console.log(`📝 Publishing to ${platform} with token: ${token.substring(0, 20)}...`);
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 100));
      
      return {
        success: true,
        platformPostId,
      };
      
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}

export { TokenRefreshService as tokenRefreshService };