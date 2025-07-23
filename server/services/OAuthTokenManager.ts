/**
 * OAUTH TOKEN MANAGER - COMPREHENSIVE TOKEN MANAGEMENT WITH REFRESH LOGIC
 * Provides authenticated auto-posting with proper OAuth token handling
 * Eliminates mock success assumptions by validating real tokens
 */

import { db } from '../db';
import { oauthTokens, type OAuthToken, type InsertOAuthToken } from '../../shared/schema';
import { eq, and } from 'drizzle-orm';
import axios from 'axios';

interface TokenRefreshConfig {
  provider: string;
  platform: string;
  refreshEndpoint: string;
  clientId: string;
  clientSecret: string;
  grantType: string;
}

export class OAuthTokenManager {
  private static instance: OAuthTokenManager;
  
  private refreshConfigs: Map<string, TokenRefreshConfig> = new Map([
    ['facebook', {
      provider: 'facebook',
      platform: 'facebook',
      refreshEndpoint: 'https://graph.facebook.com/oauth/access_token',
      clientId: process.env.FACEBOOK_APP_ID || '',
      clientSecret: process.env.FACEBOOK_APP_SECRET || '',
      grantType: 'fb_exchange_token'
    }],
    ['instagram', {
      provider: 'facebook',
      platform: 'instagram',
      refreshEndpoint: 'https://graph.facebook.com/oauth/access_token',
      clientId: process.env.FACEBOOK_APP_ID || '',
      clientSecret: process.env.FACEBOOK_APP_SECRET || '',
      grantType: 'fb_exchange_token'
    }],
    ['google', {
      provider: 'google',
      platform: 'youtube',
      refreshEndpoint: 'https://oauth2.googleapis.com/token',
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      grantType: 'refresh_token'
    }],
    ['linkedin', {
      provider: 'linkedin',
      platform: 'linkedin',
      refreshEndpoint: 'https://www.linkedin.com/oauth/v2/accessToken',
      clientId: process.env.LINKEDIN_CLIENT_ID || '',
      clientSecret: process.env.LINKEDIN_CLIENT_SECRET || '',
      grantType: 'refresh_token'
    }],
    ['twitter', {
      provider: 'twitter',
      platform: 'x',
      refreshEndpoint: 'https://api.twitter.com/2/oauth2/token',
      clientId: process.env.TWITTER_CLIENT_ID || '',
      clientSecret: process.env.TWITTER_CLIENT_SECRET || '',
      grantType: 'refresh_token'
    }]
  ]);

  public static getInstance(): OAuthTokenManager {
    if (!OAuthTokenManager.instance) {
      OAuthTokenManager.instance = new OAuthTokenManager();
    }
    return OAuthTokenManager.instance;
  }

  /**
   * Get valid OAuth token for user and platform with automatic refresh
   */
  async getValidToken(userId: string, platform: string): Promise<OAuthToken | null> {
    try {
      console.log(`🔍 Getting valid token for user ${userId}, platform ${platform}`);
      
      // Get current token from database
      const [token] = await db
        .select()
        .from(oauthTokens)
        .where(and(
          eq(oauthTokens.userId, userId),
          eq(oauthTokens.platform, platform),
          eq(oauthTokens.isValid, true)
        ))
        .limit(1);

      if (!token) {
        console.log(`❌ No OAuth token found for user ${userId}, platform ${platform}`);
        return null;
      }

      // Check if token is expired or will expire within 5 minutes
      const now = new Date();
      const expiryBuffer = new Date(now.getTime() + 5 * 60 * 1000); // 5 minutes buffer
      
      if (token.expiresAt && token.expiresAt <= expiryBuffer) {
        console.log(`🔄 Token expiring soon, attempting refresh for ${platform}`);
        const refreshedToken = await this.refreshToken(token);
        return refreshedToken || token; // Return original if refresh fails
      }

      console.log(`✅ Valid token found for ${platform}`);
      return token;
    } catch (error) {
      console.error(`❌ Error getting valid token for ${platform}:`, error);
      return null;
    }
  }

  /**
   * Refresh OAuth token using platform-specific refresh logic
   */
  async refreshToken(token: OAuthToken): Promise<OAuthToken | null> {
    try {
      const config = this.refreshConfigs.get(token.provider);
      if (!config) {
        console.error(`❌ No refresh config for provider ${token.provider}`);
        return null;
      }

      if (!token.refreshToken) {
        console.error(`❌ No refresh token available for ${token.platform}`);
        return null;
      }

      console.log(`🔄 Refreshing token for ${token.platform} via ${config.refreshEndpoint}`);

      let refreshResponse;

      // Platform-specific refresh logic
      switch (token.provider) {
        case 'facebook':
          refreshResponse = await axios.get(config.refreshEndpoint, {
            params: {
              grant_type: config.grantType,
              client_id: config.clientId,
              client_secret: config.clientSecret,
              fb_exchange_token: token.accessToken
            }
          });
          break;

        case 'google':
          refreshResponse = await axios.post(config.refreshEndpoint, {
            grant_type: config.grantType,
            client_id: config.clientId,
            client_secret: config.clientSecret,
            refresh_token: token.refreshToken
          });
          break;

        case 'linkedin':
          refreshResponse = await axios.post(config.refreshEndpoint, {
            grant_type: config.grantType,
            client_id: config.clientId,
            client_secret: config.clientSecret,
            refresh_token: token.refreshToken
          });
          break;

        case 'twitter':
          refreshResponse = await axios.post(config.refreshEndpoint, {
            grant_type: config.grantType,
            client_id: config.clientId,
            client_secret: config.clientSecret,
            refresh_token: token.refreshToken
          }, {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded'
            }
          });
          break;

        default:
          console.error(`❌ Unsupported provider for refresh: ${token.provider}`);
          return null;
      }

      const newTokenData = refreshResponse.data;
      
      // Calculate new expiry time
      const newExpiresAt = newTokenData.expires_in 
        ? new Date(Date.now() + newTokenData.expires_in * 1000)
        : null;

      // Update token in database
      const [updatedToken] = await db
        .update(oauthTokens)
        .set({
          accessToken: newTokenData.access_token,
          refreshToken: newTokenData.refresh_token || token.refreshToken,
          expiresAt: newExpiresAt,
          updatedAt: new Date()
        })
        .where(eq(oauthTokens.id, token.id))
        .returning();

      console.log(`✅ Token refreshed successfully for ${token.platform}`);
      return updatedToken;
    } catch (error: any) {
      console.error(`❌ Failed to refresh token for ${token.platform}:`, error.response?.data || error.message);
      
      // Mark token as invalid if refresh fails permanently
      await this.markTokenInvalid(token.id);
      return null;
    }
  }

  /**
   * Store new OAuth token
   */
  async storeToken(tokenData: InsertOAuthToken): Promise<OAuthToken> {
    try {
      // First, invalidate any existing tokens for this user-platform combination
      await db
        .update(oauthTokens)
        .set({ isValid: false, updatedAt: new Date() })
        .where(and(
          eq(oauthTokens.userId, tokenData.userId),
          eq(oauthTokens.platform, tokenData.platform)
        ));

      // Insert new token
      const [newToken] = await db
        .insert(oauthTokens)
        .values(tokenData)
        .returning();

      console.log(`✅ New OAuth token stored for ${tokenData.platform}`);
      return newToken;
    } catch (error) {
      console.error(`❌ Error storing OAuth token:`, error);
      throw error;
    }
  }

  /**
   * Mark token as invalid
   */
  async markTokenInvalid(tokenId: number): Promise<void> {
    try {
      await db
        .update(oauthTokens)
        .set({ isValid: false, updatedAt: new Date() })
        .where(eq(oauthTokens.id, tokenId));
      
      console.log(`✅ Token ${tokenId} marked as invalid`);
    } catch (error) {
      console.error(`❌ Error marking token invalid:`, error);
    }
  }

  /**
   * Check if user has valid OAuth connection for platform
   */
  async hasValidConnection(userId: string, platform: string): Promise<boolean> {
    const token = await this.getValidToken(userId, platform);
    return token !== null;
  }

  /**
   * Get all valid connections for user
   */
  async getUserConnections(userId: string): Promise<Record<string, boolean>> {
    try {
      const tokens = await db
        .select()
        .from(oauthTokens)
        .where(and(
          eq(oauthTokens.userId, userId),
          eq(oauthTokens.isValid, true)
        ));

      const connections: Record<string, boolean> = {
        facebook: false,
        instagram: false,
        linkedin: false,
        youtube: false,
        x: false
      };

      tokens.forEach(token => {
        if (connections.hasOwnProperty(token.platform)) {
          connections[token.platform] = true;
        }
      });

      return connections;
    } catch (error) {
      console.error(`❌ Error getting user connections:`, error);
      return {
        facebook: false,
        instagram: false,
        linkedin: false,
        youtube: false,
        x: false
      };
    }
  }

  /**
   * Validate token scopes for posting
   */
  validateScopes(token: OAuthToken, requiredScopes: string[]): boolean {
    if (!token.scope || !Array.isArray(token.scope)) {
      return false;
    }

    return requiredScopes.every(scope => 
      token.scope!.includes(scope)
    );
  }

  /**
   * Handle 401 response by attempting token refresh
   */
  async handle401Response(userId: string, platform: string): Promise<OAuthToken | null> {
    console.log(`🔄 Handling 401 response for ${platform} - attempting token refresh`);
    
    const [token] = await db
      .select()
      .from(oauthTokens)
      .where(and(
        eq(oauthTokens.userId, userId),
        eq(oauthTokens.platform, platform),
        eq(oauthTokens.isValid, true)
      ))
      .limit(1);

    if (!token) {
      console.log(`❌ No token found for 401 refresh attempt`);
      return null;
    }

    return await this.refreshToken(token);
  }
}

export const oauthTokenManager = OAuthTokenManager.getInstance();