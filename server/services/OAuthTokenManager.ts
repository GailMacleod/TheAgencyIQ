/**
 * OAUTH TOKEN MANAGER
 * Handles token validation, refresh, and expiry management for all platforms
 */

import axios from 'axios';
import { storage } from '../storage';
import { db } from '../db';
import { platformConnections } from '@shared/schema';
import { eq, and } from 'drizzle-orm';

interface TokenResult {
  success: boolean;
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: Date;
  error?: string;
}

export class OAuthTokenManager {
  
  /**
   * Get valid token for a platform, refreshing if necessary
   */
  async getValidToken(userId: number, platform: string): Promise<TokenResult> {
    try {
      // Get current OAuth connection from database
      const [connection] = await db
        .select()
        .from(platformConnections)
        .where(
          and(
            eq(platformConnections.userId, userId),
            eq(platformConnections.platform, platform)
          )
        );

      if (!connection) {
        return {
          success: false,
          error: `No OAuth connection found for ${platform}. Please connect your account.`
        };
      }

      // Check if token is still valid (not expired)
      const now = new Date();
      const bufferTime = 5 * 60 * 1000; // 5 minutes buffer
      const expiresAt = new Date(connection.expiresAt);

      if (expiresAt.getTime() > now.getTime() + bufferTime) {
        // Token is still valid
        console.log(`✅ [TOKEN] Valid token found for ${platform} (expires: ${expiresAt.toISOString()})`);
        return {
          success: true,
          accessToken: connection.accessToken,
          refreshToken: connection.refreshToken,
          expiresAt
        };
      }

      // Token is expired or about to expire - refresh it
      console.log(`🔄 [TOKEN] Token expired for ${platform}, attempting refresh...`);
      return await this.refreshToken(connection);

    } catch (error: any) {
      console.error(`❌ [TOKEN] Error getting token for ${platform}:`, error);
      return {
        success: false,
        error: `Token retrieval failed: ${error.message}`
      };
    }
  }

  /**
   * Refresh OAuth token based on platform
   */
  private async refreshToken(connection: any): Promise<TokenResult> {
    try {
      switch (connection.platform) {
        case 'facebook':
        case 'instagram':
          return await this.refreshFacebookToken(connection);
        
        case 'linkedin':
          return await this.refreshLinkedInToken(connection);
        
        case 'google':
        case 'youtube':
          return await this.refreshGoogleToken(connection);
        
        case 'x':
        case 'twitter':
          // X uses OAuth 1.0a which doesn't support refresh tokens
          return await this.validateXToken(connection);
        
        default:
          return {
            success: false,
            error: `Token refresh not supported for platform: ${connection.platform}`
          };
      }
    } catch (error: any) {
      console.error(`❌ [REFRESH] Failed to refresh ${connection.platform} token:`, error);
      return {
        success: false,
        error: `Token refresh failed: ${error.message}`
      };
    }
  }

  /**
   * Refresh Facebook/Instagram token using Graph API
   */
  private async refreshFacebookToken(connection: any): Promise<TokenResult> {
    try {
      // Facebook long-lived tokens can be refreshed via Graph API
      const response = await axios.get(
        'https://graph.facebook.com/v20.0/oauth/access_token',
        {
          params: {
            grant_type: 'fb_exchange_token',
            client_id: process.env.FACEBOOK_CLIENT_ID,
            client_secret: process.env.FACEBOOK_CLIENT_SECRET,
            fb_exchange_token: connection.accessToken
          },
          timeout: 10000
        }
      );

      const newAccessToken = response.data.access_token;
      const expiresIn = response.data.expires_in || 5184000; // Default 60 days
      const newExpiresAt = new Date(Date.now() + (expiresIn * 1000));

      // Update database with new token
      await db
        .update(platformConnections)
        .set({
          accessToken: newAccessToken,
          expiresAt: newExpiresAt
        })
        .where(eq(platformConnections.id, connection.id));

      console.log(`✅ [REFRESH] Facebook token refreshed successfully (expires: ${newExpiresAt.toISOString()})`);

      return {
        success: true,
        accessToken: newAccessToken,
        refreshToken: connection.refreshToken,
        expiresAt: newExpiresAt
      };

    } catch (error: any) {
      console.error(`❌ [REFRESH] Facebook token refresh failed:`, error.response?.data || error.message);
      return {
        success: false,
        error: `Facebook token refresh failed: ${error.response?.data?.error?.message || error.message}`
      };
    }
  }

  /**
   * Refresh LinkedIn token using OAuth 2.0
   */
  private async refreshLinkedInToken(connection: any): Promise<TokenResult> {
    try {
      if (!connection.refreshToken) {
        throw new Error('No refresh token available for LinkedIn');
      }

      const response = await axios.post(
        'https://www.linkedin.com/oauth/v2/accessToken',
        new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: connection.refreshToken,
          client_id: process.env.LINKEDIN_CLIENT_ID!,
          client_secret: process.env.LINKEDIN_CLIENT_SECRET!
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          timeout: 10000
        }
      );

      const newAccessToken = response.data.access_token;
      const newRefreshToken = response.data.refresh_token || connection.refreshToken;
      const expiresIn = response.data.expires_in || 5184000; // Default 60 days
      const newExpiresAt = new Date(Date.now() + (expiresIn * 1000));

      // Update database with new tokens
      await db
        .update(platformConnections)
        .set({
          accessToken: newAccessToken,
          refreshToken: newRefreshToken,
          expiresAt: newExpiresAt
        })
        .where(eq(platformConnections.id, connection.id));

      console.log(`✅ [REFRESH] LinkedIn token refreshed successfully (expires: ${newExpiresAt.toISOString()})`);

      return {
        success: true,
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        expiresAt: newExpiresAt
      };

    } catch (error: any) {
      console.error(`❌ [REFRESH] LinkedIn token refresh failed:`, error.response?.data || error.message);
      return {
        success: false,
        error: `LinkedIn token refresh failed: ${error.response?.data?.error_description || error.message}`
      };
    }
  }

  /**
   * Refresh Google/YouTube token using OAuth 2.0
   */
  private async refreshGoogleToken(connection: any): Promise<TokenResult> {
    try {
      if (!connection.refreshToken) {
        throw new Error('No refresh token available for Google');
      }

      const response = await axios.post(
        'https://oauth2.googleapis.com/token',
        {
          grant_type: 'refresh_token',
          refresh_token: connection.refreshToken,
          client_id: process.env.GOOGLE_CLIENT_ID,
          client_secret: process.env.GOOGLE_CLIENT_SECRET
        },
        {
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      );

      const newAccessToken = response.data.access_token;
      const expiresIn = response.data.expires_in || 3600; // Default 1 hour
      const newExpiresAt = new Date(Date.now() + (expiresIn * 1000));

      // Update database with new token
      await db
        .update(platformConnections)
        .set({
          accessToken: newAccessToken,
          expiresAt: newExpiresAt
        })
        .where(eq(platformConnections.id, connection.id));

      console.log(`✅ [REFRESH] Google token refreshed successfully (expires: ${newExpiresAt.toISOString()})`);

      return {
        success: true,
        accessToken: newAccessToken,
        refreshToken: connection.refreshToken,
        expiresAt: newExpiresAt
      };

    } catch (error: any) {
      console.error(`❌ [REFRESH] Google token refresh failed:`, error.response?.data || error.message);
      return {
        success: false,
        error: `Google token refresh failed: ${error.response?.data?.error_description || error.message}`
      };
    }
  }

  /**
   * Validate X (Twitter) token - OAuth 1.0a doesn't support refresh
   */
  private async validateXToken(connection: any): Promise<TokenResult> {
    try {
      // X uses OAuth 1.0a which doesn't expire like OAuth 2.0
      // We can validate by making a simple API call
      const OAuth = require('oauth-1.0a');
      const crypto = require('crypto');
      
      const oauth = OAuth({
        consumer: {
          key: process.env.X_CLIENT_ID || process.env.TWITTER_CLIENT_ID!,
          secret: process.env.X_CLIENT_SECRET || process.env.TWITTER_CLIENT_SECRET!
        },
        signature_method: 'HMAC-SHA1',
        hash_function(base_string: string, key: string) {
          return crypto.createHmac('sha1', key).update(base_string).digest('base64');
        }
      });

      const token = {
        key: connection.accessToken,
        secret: connection.refreshToken // For X, refreshToken stores tokenSecret
      };

      const request_data = {
        url: 'https://api.twitter.com/2/users/me',
        method: 'GET'
      };

      const auth_header = oauth.toHeader(oauth.authorize(request_data, token));

      // Test the token with a simple API call
      await axios.get(
        'https://api.twitter.com/2/users/me',
        {
          headers: auth_header,
          timeout: 10000
        }
      );

      console.log(`✅ [VALIDATE] X token is valid`);

      return {
        success: true,
        accessToken: connection.accessToken,
        refreshToken: connection.refreshToken, // token secret
        expiresAt: new Date(Date.now() + (365 * 24 * 60 * 60 * 1000)) // X tokens don't expire
      };

    } catch (error: any) {
      console.error(`❌ [VALIDATE] X token validation failed:`, error.response?.data || error.message);
      return {
        success: false,
        error: `X token validation failed: ${error.response?.data?.detail || error.message}`
      };
    }
  }

  /**
   * Mark connection as invalid (requires re-authentication)
   */
  async markConnectionInvalid(userId: number, platform: string, reason: string): Promise<void> {
    try {
      await db
        .update(platformConnections)
        .set({
          isActive: false
        })
        .where(
          and(
            eq(platformConnections.userId, userId),
            eq(platformConnections.platform, platform)
          )
        );

      console.log(`⚠️ [TOKEN] Marked ${platform} connection as invalid for user ${userId}: ${reason}`);
    } catch (error: any) {
      console.error(`❌ [TOKEN] Failed to mark connection invalid:`, error);
    }
  }

  /**
   * Get all valid connections for a user
   */
  async getAllValidConnections(userId: number): Promise<any[]> {
    try {
      const connections = await db
        .select()
        .from(platformConnections)
        .where(
          and(
            eq(platformConnections.userId, userId),
            eq(platformConnections.isActive, true)
          )
        );

      const validConnections = [];

      for (const connection of connections) {
        const tokenResult = await this.getValidToken(userId, connection.platform);
        if (tokenResult.success) {
          validConnections.push({
            ...connection,
            accessToken: tokenResult.accessToken,
            refreshToken: tokenResult.refreshToken,
            expiresAt: tokenResult.expiresAt
          });
        } else {
          // Mark connection as invalid
          await this.markConnectionInvalid(userId, connection.platform, tokenResult.error!);
        }
      }

      return validConnections;
    } catch (error: any) {
      console.error(`❌ [TOKEN] Error getting valid connections:`, error);
      return [];
    }
  }
}