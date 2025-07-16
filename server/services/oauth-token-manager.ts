/**
 * OAuth Token Manager with PKCE, Refresh Logic, and Persistence
 * Addresses the "insecure, loopy, and non-persistent" OAuth issues
 */

import crypto from 'crypto';
import axios from 'axios';
import { storage } from '../storage';

interface OAuthToken {
  access_token: string;
  refresh_token?: string;
  token_type: string;
  expires_in: number;
  expires_at: number;
  scope: string;
}

interface PKCEChallenge {
  code_verifier: string;
  code_challenge: string;
  code_challenge_method: string;
}

interface OAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  authUrl: string;
  tokenUrl: string;
  refreshUrl?: string;
  scope: string[];
  usePKCE: boolean;
}

export class OAuthTokenManager {
  private static instance: OAuthTokenManager;
  private platformConfigs: Record<string, OAuthConfig> = {};

  public static getInstance(): OAuthTokenManager {
    if (!OAuthTokenManager.instance) {
      OAuthTokenManager.instance = new OAuthTokenManager();
    }
    return OAuthTokenManager.instance;
  }

  constructor() {
    this.initializePlatformConfigs();
  }

  /**
   * Initialize OAuth configurations for all platforms
   */
  private initializePlatformConfigs(): void {
    this.platformConfigs = {
      facebook: {
        clientId: process.env.FACEBOOK_CLIENT_ID || '',
        clientSecret: process.env.FACEBOOK_CLIENT_SECRET || '',
        redirectUri: `${process.env.BASE_URL}/api/oauth/callback/facebook`,
        authUrl: 'https://www.facebook.com/v18.0/dialog/oauth',
        tokenUrl: 'https://graph.facebook.com/v18.0/oauth/access_token',
        refreshUrl: 'https://graph.facebook.com/v18.0/oauth/access_token',
        scope: ['pages_manage_posts', 'pages_read_engagement', 'pages_show_list'],
        usePKCE: true
      },
      instagram: {
        clientId: process.env.INSTAGRAM_CLIENT_ID || '',
        clientSecret: process.env.INSTAGRAM_CLIENT_SECRET || '',
        redirectUri: `${process.env.BASE_URL}/api/oauth/callback/instagram`,
        authUrl: 'https://api.instagram.com/oauth/authorize',
        tokenUrl: 'https://api.instagram.com/oauth/access_token',
        refreshUrl: 'https://graph.instagram.com/refresh_access_token',
        scope: ['user_profile', 'user_media'],
        usePKCE: true
      },
      linkedin: {
        clientId: process.env.LINKEDIN_CLIENT_ID || '',
        clientSecret: process.env.LINKEDIN_CLIENT_SECRET || '',
        redirectUri: `${process.env.BASE_URL}/api/oauth/callback/linkedin`,
        authUrl: 'https://www.linkedin.com/oauth/v2/authorization',
        tokenUrl: 'https://www.linkedin.com/oauth/v2/accessToken',
        refreshUrl: 'https://www.linkedin.com/oauth/v2/accessToken',
        scope: ['w_member_social', 'r_liteprofile'],
        usePKCE: true
      },
      twitter: {
        clientId: process.env.TWITTER_CLIENT_ID || '',
        clientSecret: process.env.TWITTER_CLIENT_SECRET || '',
        redirectUri: `${process.env.BASE_URL}/api/oauth/callback/twitter`,
        authUrl: 'https://twitter.com/i/oauth2/authorize',
        tokenUrl: 'https://api.twitter.com/2/oauth2/token',
        refreshUrl: 'https://api.twitter.com/2/oauth2/token',
        scope: ['tweet.read', 'tweet.write', 'users.read'],
        usePKCE: true
      },
      youtube: {
        clientId: process.env.YOUTUBE_CLIENT_ID || '',
        clientSecret: process.env.YOUTUBE_CLIENT_SECRET || '',
        redirectUri: `${process.env.BASE_URL}/api/oauth/callback/youtube`,
        authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
        tokenUrl: 'https://oauth2.googleapis.com/token',
        refreshUrl: 'https://oauth2.googleapis.com/token',
        scope: ['https://www.googleapis.com/auth/youtube.upload'],
        usePKCE: true
      }
    };
  }

  /**
   * Generate PKCE challenge and verifier
   */
  private generatePKCEChallenge(): PKCEChallenge {
    const code_verifier = crypto.randomBytes(32).toString('base64url');
    const code_challenge = crypto
      .createHash('sha256')
      .update(code_verifier)
      .digest('base64url');

    return {
      code_verifier,
      code_challenge,
      code_challenge_method: 'S256'
    };
  }

  /**
   * Generate secure state parameter
   */
  private generateState(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Initiate OAuth flow with PKCE
   */
  async initiateOAuth(platform: string, userId: number): Promise<{
    authUrl: string;
    state: string;
    codeVerifier: string;
  }> {
    const config = this.platformConfigs[platform];
    if (!config || !config.clientId) {
      throw new Error(`OAuth not configured for platform: ${platform}`);
    }

    const state = this.generateState();
    const pkce = this.generatePKCEChallenge();

    // Store state and code verifier in database for verification
    await storage.storeOAuthState(userId, platform, state, pkce.code_verifier);

    const params = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: config.redirectUri,
      scope: config.scope.join(' '),
      response_type: 'code',
      state: state,
      ...(config.usePKCE && {
        code_challenge: pkce.code_challenge,
        code_challenge_method: pkce.code_challenge_method
      })
    });

    const authUrl = `${config.authUrl}?${params.toString()}`;

    console.log(`🔐 OAuth initiated for ${platform}: ${authUrl}`);
    return {
      authUrl,
      state,
      codeVerifier: pkce.code_verifier
    };
  }

  /**
   * Handle OAuth callback and exchange code for tokens
   */
  async handleCallback(
    platform: string,
    code: string,
    state: string,
    userId: number
  ): Promise<{
    success: boolean;
    token?: OAuthToken;
    error?: string;
  }> {
    try {
      const config = this.platformConfigs[platform];
      if (!config) {
        return { success: false, error: 'Platform not configured' };
      }

      // Verify state parameter
      const storedState = await storage.getOAuthState(userId, platform);
      if (!storedState || storedState.state !== state) {
        return { success: false, error: 'Invalid state parameter' };
      }

      // Exchange code for tokens
      const tokenData = await this.exchangeCodeForTokens(platform, code, storedState.codeVerifier);
      
      // Store tokens securely
      await storage.storeOAuthTokens(userId, platform, tokenData);
      
      // Clean up state
      await storage.deleteOAuthState(userId, platform);

      console.log(`✅ OAuth callback handled for ${platform}`);
      return { success: true, token: tokenData };

    } catch (error) {
      console.error(`❌ OAuth callback failed for ${platform}:`, error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Exchange authorization code for access tokens
   */
  private async exchangeCodeForTokens(
    platform: string,
    code: string,
    codeVerifier: string
  ): Promise<OAuthToken> {
    const config = this.platformConfigs[platform];
    
    const tokenParams = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: config.clientId,
      client_secret: config.clientSecret,
      code: code,
      redirect_uri: config.redirectUri,
      ...(config.usePKCE && { code_verifier: codeVerifier })
    });

    const response = await axios.post(config.tokenUrl, tokenParams.toString(), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      }
    });

    const tokenData = response.data;
    
    // Normalize token response
    const token: OAuthToken = {
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      token_type: tokenData.token_type || 'Bearer',
      expires_in: tokenData.expires_in || 3600,
      expires_at: Date.now() + (tokenData.expires_in || 3600) * 1000,
      scope: tokenData.scope || config.scope.join(' ')
    };

    return token;
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshToken(userId: number, platform: string): Promise<{
    success: boolean;
    accessToken?: string;
    error?: string;
  }> {
    try {
      const config = this.platformConfigs[platform];
      if (!config || !config.refreshUrl) {
        return { success: false, error: 'Refresh not supported for platform' };
      }

      const currentToken = await storage.getOAuthTokens(userId, platform);
      if (!currentToken || !currentToken.refresh_token) {
        return { success: false, error: 'No refresh token available' };
      }

      const refreshParams = new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: config.clientId,
        client_secret: config.clientSecret,
        refresh_token: currentToken.refresh_token
      });

      const response = await axios.post(config.refreshUrl, refreshParams.toString(), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json'
        }
      });

      const tokenData = response.data;
      
      // Update token with new access token
      const updatedToken: OAuthToken = {
        ...currentToken,
        access_token: tokenData.access_token,
        expires_in: tokenData.expires_in || 3600,
        expires_at: Date.now() + (tokenData.expires_in || 3600) * 1000,
        // Some platforms provide new refresh token
        refresh_token: tokenData.refresh_token || currentToken.refresh_token
      };

      // Store updated token
      await storage.storeOAuthTokens(userId, platform, updatedToken);

      console.log(`🔄 Token refreshed for ${platform}`);
      return { success: true, accessToken: updatedToken.access_token };

    } catch (error) {
      console.error(`❌ Token refresh failed for ${platform}:`, error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Refresh failed' 
      };
    }
  }

  /**
   * Get valid access token (refresh if needed)
   */
  async getValidAccessToken(userId: number, platform: string): Promise<string | null> {
    try {
      const token = await storage.getOAuthTokens(userId, platform);
      if (!token) {
        return null;
      }

      // Check if token is still valid (with 5 minute buffer)
      const now = Date.now();
      const buffer = 5 * 60 * 1000; // 5 minutes
      
      if (token.expires_at > now + buffer) {
        return token.access_token;
      }

      // Token is expired or about to expire, try to refresh
      console.log(`⏰ Token expiring soon for ${platform}, refreshing...`);
      const refreshResult = await this.refreshToken(userId, platform);
      
      if (refreshResult.success && refreshResult.accessToken) {
        return refreshResult.accessToken;
      }

      return null;
    } catch (error) {
      console.error(`❌ Failed to get valid access token for ${platform}:`, error);
      return null;
    }
  }

  /**
   * Revoke OAuth connection
   */
  async revokeConnection(userId: number, platform: string): Promise<boolean> {
    try {
      // Remove tokens from storage
      await storage.deleteOAuthTokens(userId, platform);
      
      // Could also call platform's revoke endpoint here
      console.log(`🔐 OAuth connection revoked for ${platform}`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to revoke connection for ${platform}:`, error);
      return false;
    }
  }

  /**
   * Check if user has valid OAuth connection
   */
  async hasValidConnection(userId: number, platform: string): Promise<boolean> {
    const token = await this.getValidAccessToken(userId, platform);
    return token !== null;
  }

  /**
   * Get OAuth connection status for all platforms
   */
  async getConnectionStatus(userId: number): Promise<Record<string, boolean>> {
    const status: Record<string, boolean> = {};
    
    for (const platform of Object.keys(this.platformConfigs)) {
      status[platform] = await this.hasValidConnection(userId, platform);
    }
    
    return status;
  }

  /**
   * Get platform configuration
   */
  getPlatformConfig(platform: string): OAuthConfig | null {
    return this.platformConfigs[platform] || null;
  }
}

export const oauthTokenManager = OAuthTokenManager.getInstance();