/**
 * Enhanced OAuth Manager with Refresh Logic, CSRF Protection, and Secure Storage
 * Fixes the "leaky, no refresh, Replit nightmare" OAuth authentication issues
 */

import crypto from 'crypto';
import { db } from '../db';
import { sql } from 'drizzle-orm';

interface OAuthState {
  state: string;
  platform: string;
  userId: number;
  codeVerifier: string; // PKCE support
  csrfToken: string;
  createdAt: Date;
  expiresAt: Date;
}

interface TokenData {
  accessToken: string;
  refreshToken?: string;
  expiresAt: Date;
  scopes: string[];
  tokenType: 'Bearer' | 'oauth_token';
}

interface RefreshResult {
  success: boolean;
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: Date;
  error?: string;
  requiresReauth?: boolean;
}

export class EnhancedOAuthManager {
  private readonly OAUTH_ENDPOINTS = {
    facebook: 'https://www.facebook.com/v18.0/dialog/oauth',
    instagram: 'https://api.instagram.com/oauth/authorize',
    linkedin: 'https://www.linkedin.com/oauth/v2/authorization',
    twitter: 'https://api.twitter.com/2/oauth2/authorize',
    youtube: 'https://accounts.google.com/o/oauth2/v2/auth'
  };

  private readonly TOKEN_ENDPOINTS = {
    facebook: 'https://graph.facebook.com/v18.0/oauth/access_token',
    instagram: 'https://api.instagram.com/oauth/access_token',
    linkedin: 'https://www.linkedin.com/oauth/v2/accessToken',
    twitter: 'https://api.twitter.com/2/oauth2/token',
    youtube: 'https://oauth2.googleapis.com/token'
  };

  private readonly REFRESH_ENDPOINTS = {
    facebook: 'https://graph.facebook.com/v18.0/oauth/access_token',
    instagram: 'https://graph.instagram.com/refresh_access_token',
    linkedin: 'https://www.linkedin.com/oauth/v2/accessToken',
    twitter: 'https://api.twitter.com/2/oauth2/token',
    youtube: 'https://oauth2.googleapis.com/token'
  };

  private readonly SCOPES = {
    facebook: 'pages_manage_posts,pages_read_engagement,public_profile',
    instagram: 'user_profile,user_media',
    linkedin: 'r_liteprofile,w_member_social',
    twitter: 'tweet.read tweet.write users.read offline.access',
    youtube: 'https://www.googleapis.com/auth/youtube.upload'
  };

  private oauthStates: Map<string, OAuthState> = new Map();

  /**
   * Generate PKCE code verifier and challenge for OAuth 2.0
   */
  private generatePKCE(): { codeVerifier: string; codeChallenge: string } {
    const codeVerifier = crypto.randomBytes(32).toString('base64url');
    const codeChallenge = crypto
      .createHash('sha256')
      .update(codeVerifier)
      .digest('base64url');
    
    return { codeVerifier, codeChallenge };
  }

  /**
   * Initiate OAuth flow with CSRF protection and PKCE
   */
  async initiateOAuthFlow(platform: string, userId: number): Promise<{
    success: boolean;
    authUrl?: string;
    state?: string;
    error?: string;
  }> {
    try {
      const state = crypto.randomBytes(32).toString('hex');
      const csrfToken = crypto.randomBytes(32).toString('hex');
      const { codeVerifier, codeChallenge } = this.generatePKCE();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      // Store OAuth state in Replit DB for persistence
      const oauthState: OAuthState = {
        state,
        platform,
        userId,
        codeVerifier,
        csrfToken,
        createdAt: new Date(),
        expiresAt
      };

      this.oauthStates.set(state, oauthState);

      // Also store in database for persistence across deployments
      await db.execute(sql`
        INSERT INTO oauth_states (state, platform, user_id, code_verifier, csrf_token, expires_at)
        VALUES (${state}, ${platform}, ${userId}, ${codeVerifier}, ${csrfToken}, ${expiresAt})
        ON CONFLICT (state) DO UPDATE SET
          platform = ${platform},
          user_id = ${userId},
          code_verifier = ${codeVerifier},
          csrf_token = ${csrfToken},
          expires_at = ${expiresAt}
      `);

      // Get client credentials
      const clientId = process.env[`${platform.toUpperCase()}_CLIENT_ID`];
      if (!clientId) {
        throw new Error(`${platform.toUpperCase()}_CLIENT_ID environment variable not set`);
      }

      const redirectUri = `${process.env.BASE_URL || 'http://localhost:3000'}/api/auth/callback/${platform}`;
      const scope = this.SCOPES[platform as keyof typeof this.SCOPES];

      let authUrl = `${this.OAUTH_ENDPOINTS[platform as keyof typeof this.OAUTH_ENDPOINTS]}?`;
      authUrl += `client_id=${clientId}`;
      authUrl += `&redirect_uri=${encodeURIComponent(redirectUri)}`;
      authUrl += `&scope=${encodeURIComponent(scope)}`;
      authUrl += `&state=${state}`;
      authUrl += `&response_type=code`;

      // Add PKCE for platforms that support it
      if (platform === 'twitter' || platform === 'youtube') {
        authUrl += `&code_challenge=${codeChallenge}`;
        authUrl += `&code_challenge_method=S256`;
      }

      // Platform-specific parameters
      if (platform === 'facebook' || platform === 'instagram') {
        authUrl += '&access_type=offline'; // Request refresh token
      }

      console.log(`🔐 OAuth flow initiated for ${platform} - User ${userId}`);
      console.log(`🔒 CSRF Token: ${csrfToken.substring(0, 10)}...`);
      console.log(`🔑 PKCE Challenge: ${codeChallenge.substring(0, 10)}...`);

      return {
        success: true,
        authUrl,
        state
      };

    } catch (error) {
      console.error(`❌ OAuth initiation failed for ${platform}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Handle OAuth callback with proper error handling
   */
  async handleOAuthCallback(
    platform: string,
    code: string,
    state: string,
    error?: string
  ): Promise<{
    success: boolean;
    userId?: number;
    error?: string;
    requiresReauth?: boolean;
  }> {
    try {
      // Check for OAuth errors first
      if (error) {
        console.error(`❌ OAuth error from ${platform}:`, error);
        return {
          success: false,
          error: error === 'access_denied' ? 'User denied access' : error,
          requiresReauth: true
        };
      }

      // Validate state parameter (CSRF protection)
      const oauthState = this.oauthStates.get(state) || await this.loadOAuthStateFromDB(state);
      
      if (!oauthState) {
        console.error(`❌ Invalid OAuth state: ${state}`);
        return {
          success: false,
          error: 'Invalid OAuth state - possible CSRF attack',
          requiresReauth: true
        };
      }

      // Check expiration
      if (new Date() > oauthState.expiresAt) {
        console.error(`❌ OAuth state expired for ${platform}`);
        return {
          success: false,
          error: 'OAuth state expired - please try again',
          requiresReauth: true
        };
      }

      // Exchange code for tokens
      const tokenResult = await this.exchangeCodeForTokens(platform, code, oauthState);
      
      if (!tokenResult.success) {
        console.error(`❌ Token exchange failed for ${platform}:`, tokenResult.error);
        return {
          success: false,
          error: tokenResult.error || 'Token exchange failed',
          requiresReauth: tokenResult.error?.includes('invalid_grant') || false
        };
      }

      // Store tokens securely in database
      await this.storeTokensSecurely(oauthState.userId, platform, tokenResult);

      // Cleanup OAuth state
      this.oauthStates.delete(state);
      await db.execute(sql`DELETE FROM oauth_states WHERE state = ${state}`);

      console.log(`✅ OAuth callback successful for ${platform} - User ${oauthState.userId}`);
      
      return {
        success: true,
        userId: oauthState.userId
      };

    } catch (error) {
      console.error(`❌ OAuth callback error for ${platform}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        requiresReauth: true
      };
    }
  }

  /**
   * Exchange authorization code for access tokens
   */
  private async exchangeCodeForTokens(
    platform: string,
    code: string,
    oauthState: OAuthState
  ): Promise<{
    success: boolean;
    accessToken?: string;
    refreshToken?: string;
    expiresAt?: Date;
    error?: string;
  }> {
    try {
      const clientId = process.env[`${platform.toUpperCase()}_CLIENT_ID`];
      const clientSecret = process.env[`${platform.toUpperCase()}_CLIENT_SECRET`];

      if (!clientId || !clientSecret) {
        throw new Error(`Missing ${platform.toUpperCase()} credentials`);
      }

      const redirectUri = `${process.env.BASE_URL || 'http://localhost:3000'}/api/auth/callback/${platform}`;
      const tokenEndpoint = this.TOKEN_ENDPOINTS[platform as keyof typeof this.TOKEN_ENDPOINTS];

      const requestBody = new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri
      });

      // Add PKCE for platforms that support it
      if (platform === 'twitter' || platform === 'youtube') {
        requestBody.append('code_verifier', oauthState.codeVerifier);
      }

      const response = await fetch(tokenEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json'
        },
        body: requestBody
      });

      const data = await response.json();

      if (!response.ok || data.error) {
        throw new Error(data.error_description || data.error || 'Token exchange failed');
      }

      const expiresAt = data.expires_in 
        ? new Date(Date.now() + (data.expires_in * 1000))
        : new Date(Date.now() + (60 * 60 * 1000)); // Default 1 hour

      return {
        success: true,
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresAt
      };

    } catch (error) {
      console.error(`❌ Token exchange failed for ${platform}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(userId: number, platform: string): Promise<RefreshResult> {
    try {
      console.log(`🔄 Refreshing token for user ${userId} on ${platform}`);

      // Get stored tokens
      const tokenData = await this.getStoredTokens(userId, platform);
      
      if (!tokenData || !tokenData.refreshToken) {
        console.error(`❌ No refresh token available for ${platform}`);
        return {
          success: false,
          error: 'No refresh token available',
          requiresReauth: true
        };
      }

      const refreshResult = await this.performTokenRefresh(platform, tokenData.refreshToken);
      
      if (!refreshResult.success) {
        console.error(`❌ Token refresh failed for ${platform}:`, refreshResult.error);
        return refreshResult;
      }

      // Update stored tokens
      await this.updateStoredTokens(userId, platform, refreshResult);

      console.log(`✅ Token refreshed successfully for ${platform} - User ${userId}`);
      
      return refreshResult;

    } catch (error) {
      console.error(`❌ Token refresh error for ${platform}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        requiresReauth: true
      };
    }
  }

  /**
   * Perform platform-specific token refresh
   */
  private async performTokenRefresh(platform: string, refreshToken: string): Promise<RefreshResult> {
    try {
      const clientId = process.env[`${platform.toUpperCase()}_CLIENT_ID`];
      const clientSecret = process.env[`${platform.toUpperCase()}_CLIENT_SECRET`];

      if (!clientId || !clientSecret) {
        throw new Error(`Missing ${platform.toUpperCase()} credentials`);
      }

      const refreshEndpoint = this.REFRESH_ENDPOINTS[platform as keyof typeof this.REFRESH_ENDPOINTS];

      let requestBody: URLSearchParams;
      let headers: Record<string, string> = {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      };

      switch (platform) {
        case 'facebook':
          requestBody = new URLSearchParams({
            grant_type: 'refresh_token',
            refresh_token: refreshToken,
            client_id: clientId,
            client_secret: clientSecret
          });
          break;

        case 'instagram':
          // Instagram uses different endpoint for refresh
          const igResponse = await fetch(
            `https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=${refreshToken}`
          );
          const igData = await igResponse.json();
          
          if (!igResponse.ok || igData.error) {
            throw new Error(igData.error?.message || 'Instagram token refresh failed');
          }

          return {
            success: true,
            accessToken: igData.access_token,
            expiresAt: new Date(Date.now() + (igData.expires_in * 1000))
          };

        case 'linkedin':
          requestBody = new URLSearchParams({
            grant_type: 'refresh_token',
            refresh_token: refreshToken,
            client_id: clientId,
            client_secret: clientSecret
          });
          break;

        case 'twitter':
          requestBody = new URLSearchParams({
            grant_type: 'refresh_token',
            refresh_token: refreshToken,
            client_id: clientId
          });
          headers['Authorization'] = `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`;
          break;

        case 'youtube':
          requestBody = new URLSearchParams({
            grant_type: 'refresh_token',
            refresh_token: refreshToken,
            client_id: clientId,
            client_secret: clientSecret
          });
          break;

        default:
          throw new Error(`Unsupported platform: ${platform}`);
      }

      const response = await fetch(refreshEndpoint, {
        method: 'POST',
        headers,
        body: requestBody
      });

      const data = await response.json();

      if (!response.ok || data.error) {
        // Handle specific error cases
        if (data.error === 'invalid_grant' || data.error_description?.includes('invalid_grant')) {
          return {
            success: false,
            error: 'Refresh token expired or invalid',
            requiresReauth: true
          };
        }
        
        throw new Error(data.error_description || data.error || 'Token refresh failed');
      }

      const expiresAt = data.expires_in 
        ? new Date(Date.now() + (data.expires_in * 1000))
        : new Date(Date.now() + (60 * 60 * 1000)); // Default 1 hour

      return {
        success: true,
        accessToken: data.access_token,
        refreshToken: data.refresh_token || refreshToken, // Keep existing if not provided
        expiresAt
      };

    } catch (error) {
      console.error(`❌ Platform token refresh failed for ${platform}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        requiresReauth: error instanceof Error && error.message.includes('invalid_grant')
      };
    }
  }

  /**
   * Store tokens securely in database
   */
  private async storeTokensSecurely(
    userId: number,
    platform: string,
    tokenData: {
      accessToken?: string;
      refreshToken?: string;
      expiresAt?: Date;
    }
  ): Promise<void> {
    try {
      // Encrypt tokens before storing
      const encryptedAccessToken = this.encryptToken(tokenData.accessToken || '');
      const encryptedRefreshToken = tokenData.refreshToken 
        ? this.encryptToken(tokenData.refreshToken)
        : null;

      await db.execute(sql`
        INSERT INTO platform_tokens (user_id, platform, access_token, refresh_token, expires_at, updated_at)
        VALUES (${userId}, ${platform}, ${encryptedAccessToken}, ${encryptedRefreshToken}, ${tokenData.expiresAt}, ${new Date()})
        ON CONFLICT (user_id, platform) DO UPDATE SET
          access_token = ${encryptedAccessToken},
          refresh_token = ${encryptedRefreshToken},
          expires_at = ${tokenData.expiresAt},
          updated_at = ${new Date()}
      `);

      console.log(`🔐 Tokens stored securely for ${platform} - User ${userId}`);
    } catch (error) {
      console.error(`❌ Failed to store tokens for ${platform}:`, error);
      throw error;
    }
  }

  /**
   * Get stored tokens from database
   */
  private async getStoredTokens(userId: number, platform: string): Promise<TokenData | null> {
    try {
      const result = await db.execute(sql`
        SELECT access_token, refresh_token, expires_at
        FROM platform_tokens
        WHERE user_id = ${userId} AND platform = ${platform}
      `);

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0] as any;
      
      return {
        accessToken: this.decryptToken(row.access_token),
        refreshToken: row.refresh_token ? this.decryptToken(row.refresh_token) : undefined,
        expiresAt: new Date(row.expires_at),
        scopes: [], // TODO: Store scopes
        tokenType: 'Bearer'
      };
    } catch (error) {
      console.error(`❌ Failed to get stored tokens for ${platform}:`, error);
      return null;
    }
  }

  /**
   * Update stored tokens after refresh
   */
  private async updateStoredTokens(
    userId: number,
    platform: string,
    tokenData: RefreshResult
  ): Promise<void> {
    try {
      const encryptedAccessToken = this.encryptToken(tokenData.accessToken || '');
      const encryptedRefreshToken = tokenData.refreshToken 
        ? this.encryptToken(tokenData.refreshToken)
        : null;

      await db.execute(sql`
        UPDATE platform_tokens
        SET access_token = ${encryptedAccessToken},
            refresh_token = COALESCE(${encryptedRefreshToken}, refresh_token),
            expires_at = ${tokenData.expiresAt},
            updated_at = ${new Date()}
        WHERE user_id = ${userId} AND platform = ${platform}
      `);

      console.log(`🔄 Tokens updated for ${platform} - User ${userId}`);
    } catch (error) {
      console.error(`❌ Failed to update tokens for ${platform}:`, error);
      throw error;
    }
  }

  /**
   * Load OAuth state from database
   */
  private async loadOAuthStateFromDB(state: string): Promise<OAuthState | null> {
    try {
      const result = await db.execute(sql`
        SELECT * FROM oauth_states
        WHERE state = ${state}
        AND expires_at > ${new Date()}
      `);

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0] as any;
      
      return {
        state: row.state,
        platform: row.platform,
        userId: row.user_id,
        codeVerifier: row.code_verifier,
        csrfToken: row.csrf_token,
        createdAt: new Date(row.created_at),
        expiresAt: new Date(row.expires_at)
      };
    } catch (error) {
      console.error(`❌ Failed to load OAuth state:`, error);
      return null;
    }
  }

  /**
   * Encrypt token for secure storage
   */
  private encryptToken(token: string): string {
    const algorithm = 'aes-256-gcm';
    const key = crypto.createHash('sha256').update(process.env.JWT_SECRET || 'default-secret').digest();
    const iv = crypto.randomBytes(16);
    
    const cipher = crypto.createCipher(algorithm, key);
    let encrypted = cipher.update(token, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    return iv.toString('hex') + ':' + encrypted;
  }

  /**
   * Decrypt token from secure storage
   */
  private decryptToken(encryptedToken: string): string {
    const algorithm = 'aes-256-gcm';
    const key = crypto.createHash('sha256').update(process.env.JWT_SECRET || 'default-secret').digest();
    
    const parts = encryptedToken.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];
    
    const decipher = crypto.createDecipher(algorithm, key);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }

  /**
   * Validate if token needs refresh
   */
  async validateToken(userId: number, platform: string): Promise<{
    isValid: boolean;
    needsRefresh: boolean;
    error?: string;
  }> {
    try {
      const tokenData = await this.getStoredTokens(userId, platform);
      
      if (!tokenData) {
        return {
          isValid: false,
          needsRefresh: false,
          error: 'No token found'
        };
      }

      const now = new Date();
      const expiryTime = new Date(tokenData.expiresAt);
      const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);

      // Token is expired or will expire soon
      if (expiryTime <= oneHourFromNow) {
        return {
          isValid: false,
          needsRefresh: true
        };
      }

      return {
        isValid: true,
        needsRefresh: false
      };

    } catch (error) {
      console.error(`❌ Token validation failed for ${platform}:`, error);
      return {
        isValid: false,
        needsRefresh: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get valid access token (refresh if needed)
   */
  async getValidAccessToken(userId: number, platform: string): Promise<string | null> {
    try {
      const validation = await this.validateToken(userId, platform);
      
      if (validation.isValid) {
        const tokenData = await this.getStoredTokens(userId, platform);
        return tokenData?.accessToken || null;
      }

      if (validation.needsRefresh) {
        const refreshResult = await this.refreshAccessToken(userId, platform);
        return refreshResult.success ? refreshResult.accessToken || null : null;
      }

      return null;
    } catch (error) {
      console.error(`❌ Failed to get valid access token for ${platform}:`, error);
      return null;
    }
  }

  /**
   * Clean up expired OAuth states
   */
  async cleanupExpiredStates(): Promise<void> {
    try {
      const now = new Date();
      
      // Clean up in-memory states
      for (const [state, oauthState] of this.oauthStates.entries()) {
        if (now > oauthState.expiresAt) {
          this.oauthStates.delete(state);
        }
      }

      // Clean up database states
      await db.execute(sql`
        DELETE FROM oauth_states
        WHERE expires_at <= ${now}
      `);

      console.log('🧹 Expired OAuth states cleaned up');
    } catch (error) {
      console.error('❌ Failed to clean up expired states:', error);
    }
  }
}

export const enhancedOAuthManager = new EnhancedOAuthManager();