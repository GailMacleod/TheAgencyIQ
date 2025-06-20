/**
 * OAuth Token Validator - Direct API Testing
 * Validates platform tokens and provides clear repair instructions
 */

import { storage } from './storage';
import { db } from './db';
import { platformConnections } from '../shared/schema';
import { eq } from 'drizzle-orm';

interface TokenStatus {
  platform: string;
  isValid: boolean;
  error?: string;
  action: 'valid' | 'expired' | 'invalid' | 'missing_permissions';
  details?: string;
}

export class OAuthTokenValidator {
  
  /**
   * Test all platform tokens for a user
   */
  static async validateAllTokens(userId: number): Promise<{
    results: TokenStatus[];
    summary: {
      valid: number;
      invalid: number;
      requiresReauth: string[];
    };
  }> {
    console.log(`🔍 Validating OAuth tokens for user ${userId}`);
    
    const connections = await db.select()
      .from(platformConnections)
      .where(eq(platformConnections.userId, userId));
    
    const results: TokenStatus[] = [];
    const requiresReauth: string[] = [];
    let validCount = 0;
    let invalidCount = 0;
    
    for (const connection of connections) {
      const status = await this.testPlatformToken(connection);
      results.push(status);
      
      if (status.isValid) {
        validCount++;
        // Mark as active in database
        await db.update(platformConnections)
          .set({ isActive: true })
          .where(eq(platformConnections.id, connection.id));
      } else {
        invalidCount++;
        requiresReauth.push(connection.platform);
        // Mark as inactive in database
        await db.update(platformConnections)
          .set({ isActive: false })
          .where(eq(platformConnections.id, connection.id));
      }
    }
    
    return {
      results,
      summary: {
        valid: validCount,
        invalid: invalidCount,
        requiresReauth
      }
    };
  }
  
  /**
   * Test individual platform token
   */
  private static async testPlatformToken(connection: any): Promise<TokenStatus> {
    const { platform, accessToken } = connection;
    
    try {
      switch (platform) {
        case 'facebook':
          return await this.testFacebookToken(accessToken);
        case 'linkedin':
          return await this.testLinkedInToken(accessToken);
        case 'x':
          return await this.testXToken(accessToken);
        case 'instagram':
          return await this.testInstagramToken(accessToken);
        case 'youtube':
          return await this.testYouTubeToken(accessToken);
        default:
          return {
            platform,
            isValid: false,
            action: 'invalid',
            error: 'Unsupported platform'
          };
      }
    } catch (error: any) {
      return {
        platform,
        isValid: false,
        action: 'invalid',
        error: `Test failed: ${error.message}`
      };
    }
  }
  
  /**
   * Test Facebook token
   */
  private static async testFacebookToken(token: string): Promise<TokenStatus> {
    try {
      // Check if token is obviously fake
      if (token.includes('demo') || token.includes('valid_') || token.length < 50) {
        return {
          platform: 'facebook',
          isValid: false,
          action: 'invalid',
          error: 'Mock token detected',
          details: 'Token appears to be a demo/test token, not a real OAuth token'
        };
      }
      
      const response = await fetch(`https://graph.facebook.com/me?access_token=${token}`);
      const data = await response.json();
      
      if (data.error) {
        if (data.error.code === 190) {
          return {
            platform: 'facebook',
            isValid: false,
            action: 'expired',
            error: 'Token expired or invalid',
            details: data.error.message
          };
        }
        return {
          platform: 'facebook',
          isValid: false,
          action: 'invalid',
          error: data.error.message
        };
      }
      
      // Check permissions
      const permResponse = await fetch(`https://graph.facebook.com/me/permissions?access_token=${token}`);
      const permData = await permResponse.json();
      
      if (permData.data) {
        const granted = permData.data.filter((p: any) => p.status === 'granted').map((p: any) => p.permission);
        const required = ['pages_manage_posts', 'pages_read_engagement'];
        const missing = required.filter(p => !granted.includes(p));
        
        if (missing.length > 0) {
          return {
            platform: 'facebook',
            isValid: false,
            action: 'missing_permissions',
            error: `Missing permissions: ${missing.join(', ')}`,
            details: 'Re-authenticate to grant required permissions'
          };
        }
      }
      
      return {
        platform: 'facebook',
        isValid: true,
        action: 'valid'
      };
      
    } catch (error: any) {
      return {
        platform: 'facebook',
        isValid: false,
        action: 'invalid',
        error: `Network error: ${error.message}`
      };
    }
  }
  
  /**
   * Test LinkedIn token
   */
  private static async testLinkedInToken(token: string): Promise<TokenStatus> {
    try {
      // Check if token is obviously fake
      if (token.includes('demo') || token.includes('valid_') || token.length < 50) {
        return {
          platform: 'linkedin',
          isValid: false,
          action: 'invalid',
          error: 'Mock token detected',
          details: 'Token appears to be a demo/test token, not a real OAuth token'
        };
      }
      
      const response = await fetch('https://api.linkedin.com/v2/me', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'cache-control': 'no-cache',
          'X-Restli-Protocol-Version': '2.0.0'
        }
      });
      
      if (response.status === 401) {
        return {
          platform: 'linkedin',
          isValid: false,
          action: 'expired',
          error: 'Token expired or invalid'
        };
      }
      
      const data = await response.json();
      if (data.id) {
        return {
          platform: 'linkedin',
          isValid: true,
          action: 'valid'
        };
      }
      
      return {
        platform: 'linkedin',
        isValid: false,
        action: 'invalid',
        error: 'Invalid API response'
      };
      
    } catch (error: any) {
      return {
        platform: 'linkedin',
        isValid: false,
        action: 'invalid',
        error: `Network error: ${error.message}`
      };
    }
  }
  
  /**
   * Test X/Twitter token
   */
  private static async testXToken(token: string): Promise<TokenStatus> {
    return {
      platform: 'x',
      isValid: false,
      action: 'invalid',
      error: 'OAuth 1.0a requires manual validation',
      details: 'X/Twitter uses OAuth 1.0a which requires signature validation - please re-authenticate'
    };
  }
  
  /**
   * Test Instagram token
   */
  private static async testInstagramToken(token: string): Promise<TokenStatus> {
    return {
      platform: 'instagram',
      isValid: false,
      action: 'invalid',
      error: 'Depends on Facebook connection',
      details: 'Instagram Business API requires valid Facebook connection - re-authenticate Facebook first'
    };
  }
  
  /**
   * Test YouTube token
   */
  private static async testYouTubeToken(token: string): Promise<TokenStatus> {
    try {
      // Check if token is obviously fake
      if (token.includes('demo') || token.includes('valid_') || token.length < 50) {
        return {
          platform: 'youtube',
          isValid: false,
          action: 'invalid',
          error: 'Mock token detected',
          details: 'Token appears to be a demo/test token, not a real OAuth token'
        };
      }
      
      const response = await fetch('https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const data = await response.json();
      
      if (data.error) {
        if (data.error.code === 401) {
          return {
            platform: 'youtube',
            isValid: false,
            action: 'expired',
            error: 'Token expired'
          };
        }
        return {
          platform: 'youtube',
          isValid: false,
          action: 'invalid',
          error: data.error.message
        };
      }
      
      if (data.items && data.items.length > 0) {
        return {
          platform: 'youtube',
          isValid: true,
          action: 'valid'
        };
      }
      
      return {
        platform: 'youtube',
        isValid: false,
        action: 'invalid',
        error: 'No channels found'
      };
      
    } catch (error: any) {
      return {
        platform: 'youtube',
        isValid: false,
        action: 'invalid',
        error: `Network error: ${error.message}`
      };
    }
  }
}