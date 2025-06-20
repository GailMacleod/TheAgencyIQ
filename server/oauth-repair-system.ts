/**
 * OAuth Token Repair System
 * Comprehensive token validation and refresh for all platforms
 */

import { storage } from './storage';
import { BulletproofPublisher } from './bulletproof-publisher';

interface TokenValidationResult {
  isValid: boolean;
  needsRefresh: boolean;
  error?: string;
  action: 'valid' | 'refresh' | 'reconnect' | 'invalid';
}

export class OAuthRepairSystem {
  
  /**
   * Validate and repair all platform tokens for a user
   */
  static async repairAllTokens(userId: number): Promise<{
    repaired: number;
    failed: number;
    requiresManualAuth: string[];
  }> {
    console.log(`🔧 OAUTH REPAIR: Starting token validation for user ${userId}`);
    
    const connections = await storage.getAllPlatformConnections(userId);
    const results = {
      repaired: 0,
      failed: 0,
      requiresManualAuth: [] as string[]
    };
    
    for (const connection of connections) {
      console.log(`\n--- VALIDATING ${connection.platform.toUpperCase()} ---`);
      
      try {
        const validation = await this.validateToken(connection);
        
        switch (validation.action) {
          case 'valid':
            console.log(`✅ ${connection.platform} token is valid`);
            await this.markConnectionHealthy(connection.id);
            results.repaired++;
            break;
            
          case 'refresh':
            console.log(`🔄 Refreshing ${connection.platform} token`);
            const refreshed = await this.refreshToken(connection);
            if (refreshed) {
              results.repaired++;
            } else {
              results.failed++;
              results.requiresManualAuth.push(connection.platform);
            }
            break;
            
          case 'reconnect':
          case 'invalid':
            console.log(`❌ ${connection.platform} requires manual re-authentication`);
            await this.markConnectionInactive(connection.id);
            results.requiresManualAuth.push(connection.platform);
            results.failed++;
            break;
        }
        
      } catch (error: any) {
        console.error(`❌ Error validating ${connection.platform}:`, error.message);
        results.failed++;
        results.requiresManualAuth.push(connection.platform);
      }
    }
    
    console.log(`\n📊 REPAIR SUMMARY: ${results.repaired} repaired, ${results.failed} failed`);
    return results;
  }
  
  /**
   * Validate individual platform token
   */
  private static async validateToken(connection: any): Promise<TokenValidationResult> {
    switch (connection.platform) {
      case 'facebook':
        return await this.validateFacebookToken(connection);
      case 'linkedin':
        return await this.validateLinkedInToken(connection);
      case 'x':
        return await this.validateXToken(connection);
      case 'instagram':
        return await this.validateInstagramToken(connection);
      case 'youtube':
        return await this.validateYouTubeToken(connection);
      default:
        return { isValid: false, needsRefresh: false, action: 'invalid', error: 'Unsupported platform' };
    }
  }
  
  /**
   * Validate Facebook token
   */
  private static async validateFacebookToken(connection: any): Promise<TokenValidationResult> {
    try {
      const response = await fetch(`https://graph.facebook.com/me?access_token=${connection.accessToken}`);
      const data = await response.json();
      
      if (data.error) {
        if (data.error.code === 190) {
          // Token expired or invalid
          return { isValid: false, needsRefresh: true, action: 'reconnect', error: 'Token expired' };
        }
        return { isValid: false, needsRefresh: false, action: 'invalid', error: data.error.message };
      }
      
      // Check permissions
      const permResponse = await fetch(`https://graph.facebook.com/me/permissions?access_token=${connection.accessToken}`);
      const permData = await permResponse.json();
      
      if (permData.data) {
        const granted = permData.data.filter((p: any) => p.status === 'granted').map((p: any) => p.permission);
        const required = ['pages_manage_posts', 'pages_read_engagement'];
        const missing = required.filter(p => !granted.includes(p));
        
        if (missing.length > 0) {
          return { isValid: false, needsRefresh: false, action: 'reconnect', error: `Missing permissions: ${missing.join(', ')}` };
        }
      }
      
      return { isValid: true, needsRefresh: false, action: 'valid' };
      
    } catch (error: any) {
      return { isValid: false, needsRefresh: false, action: 'invalid', error: error.message };
    }
  }
  
  /**
   * Validate LinkedIn token
   */
  private static async validateLinkedInToken(connection: any): Promise<TokenValidationResult> {
    try {
      const response = await fetch('https://api.linkedin.com/v2/me', {
        headers: {
          'Authorization': `Bearer ${connection.accessToken}`,
          'cache-control': 'no-cache',
          'X-Restli-Protocol-Version': '2.0.0'
        }
      });
      
      if (response.status === 401) {
        return { isValid: false, needsRefresh: true, action: 'reconnect', error: 'Token expired' };
      }
      
      const data = await response.json();
      if (data.id) {
        return { isValid: true, needsRefresh: false, action: 'valid' };
      }
      
      return { isValid: false, needsRefresh: false, action: 'invalid', error: 'Invalid response' };
      
    } catch (error: any) {
      return { isValid: false, needsRefresh: false, action: 'invalid', error: error.message };
    }
  }
  
  /**
   * Validate X/Twitter token (OAuth 1.0a)
   */
  private static async validateXToken(connection: any): Promise<TokenValidationResult> {
    // X requires OAuth 1.0a signature validation
    // For now, mark as requiring manual reconnection
    return { isValid: false, needsRefresh: false, action: 'reconnect', error: 'OAuth 1.0a validation required' };
  }
  
  /**
   * Validate Instagram token (requires Facebook)
   */
  private static async validateInstagramToken(connection: any): Promise<TokenValidationResult> {
    // Instagram Business API requires valid Facebook connection
    const fbConnection = await storage.getPlatformConnection(connection.userId, 'facebook');
    if (!fbConnection || !fbConnection.isActive) {
      return { isValid: false, needsRefresh: false, action: 'reconnect', error: 'Requires valid Facebook connection' };
    }
    
    return { isValid: true, needsRefresh: false, action: 'valid' };
  }
  
  /**
   * Validate YouTube token
   */
  private static async validateYouTubeToken(connection: any): Promise<TokenValidationResult> {
    try {
      const response = await fetch('https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true', {
        headers: {
          'Authorization': `Bearer ${connection.accessToken}`
        }
      });
      
      const data = await response.json();
      
      if (data.error) {
        if (data.error.code === 401) {
          return { isValid: false, needsRefresh: true, action: 'refresh', error: 'Token expired' };
        }
        return { isValid: false, needsRefresh: false, action: 'invalid', error: data.error.message };
      }
      
      if (data.items && data.items.length > 0) {
        return { isValid: true, needsRefresh: false, action: 'valid' };
      }
      
      return { isValid: false, needsRefresh: false, action: 'invalid', error: 'No channels found' };
      
    } catch (error: any) {
      return { isValid: false, needsRefresh: false, action: 'invalid', error: error.message };
    }
  }
  
  /**
   * Attempt to refresh token using refresh_token
   */
  private static async refreshToken(connection: any): Promise<boolean> {
    if (!connection.refreshToken) {
      console.log(`❌ No refresh token available for ${connection.platform}`);
      return false;
    }
    
    try {
      // Platform-specific refresh logic would go here
      // For now, mark as requiring manual re-authentication
      console.log(`🔄 ${connection.platform} refresh requires platform-specific implementation`);
      return false;
      
    } catch (error: any) {
      console.error(`❌ Token refresh failed for ${connection.platform}:`, error.message);
      return false;
    }
  }
  
  /**
   * Mark connection as healthy and active
   */
  private static async markConnectionHealthy(connectionId: number): Promise<void> {
    await storage.updatePlatformConnectionStatus(connectionId, true);
  }
  
  /**
   * Mark connection as inactive (requires re-auth)
   */
  private static async markConnectionInactive(connectionId: number): Promise<void> {
    await storage.updatePlatformConnectionStatus(connectionId, false);
  }
  
  /**
   * Auto-retry failed posts after token repair
   */
  static async retryFailedPosts(userId: number): Promise<number> {
    console.log(`🔄 RETRY: Attempting to republish failed posts for user ${userId}`);
    
    const failedPosts = await storage.getFailedPosts(userId);
    let successCount = 0;
    
    for (const post of failedPosts) {
      try {
        const result = await BulletproofPublisher.publish({
          userId,
          platform: post.platform,
          content: post.content
        });
        
        if (result.success) {
          await storage.markPostAsPublished(post.id, result.platformPostId);
          successCount++;
          console.log(`✅ Republished ${post.platform} post ${post.id}`);
        }
        
      } catch (error: any) {
        console.error(`❌ Retry failed for post ${post.id}:`, error.message);
      }
    }
    
    console.log(`📊 RETRY SUMMARY: ${successCount}/${failedPosts.length} posts republished`);
    return successCount;
  }
}