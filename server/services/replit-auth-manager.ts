import crypto from 'crypto';
import { db } from '../db';
import { sql } from 'drizzle-orm';

interface OAuthState {
  state: string;
  platform: string;
  userId: number;
  createdAt: Date;
  expiresAt: Date;
}

interface OAuthResult {
  success: boolean;
  authUrl?: string;
  state?: string;
  error?: string;
}

export class ReplitAuthManager {
  private readonly OAUTH_ENDPOINTS = {
    twitter: 'https://api.twitter.com/2/oauth2/authorize',
    facebook: 'https://www.facebook.com/v18.0/dialog/oauth',
    instagram: 'https://api.instagram.com/oauth/authorize',
    linkedin: 'https://www.linkedin.com/oauth/v2/authorization',
    youtube: 'https://accounts.google.com/o/oauth2/v2/auth'
  };

  private readonly SCOPES = {
    twitter: 'tweet.read tweet.write users.read offline.access',
    facebook: 'pages_manage_posts pages_read_engagement public_profile',
    instagram: 'user_profile,user_media',
    linkedin: 'r_liteprofile r_emailaddress w_member_social',
    youtube: 'https://www.googleapis.com/auth/youtube.upload'
  };

  private oauthStates: Map<string, OAuthState> = new Map();

  async sendEmailVerification(email: string): Promise<boolean> {
    try {
      const code = crypto.randomBytes(3).toString('hex').toUpperCase();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      await db.execute(sql`
        INSERT INTO verification_codes (email, code, expires_at)
        VALUES (${email}, ${code}, ${expiresAt})
        ON CONFLICT (email) DO UPDATE SET
          code = ${code},
          expires_at = ${expiresAt},
          created_at = ${new Date()}
      `);

      // In a real implementation, send actual email
      console.log(`📧 Email verification code for ${email}: ${code}`);
      return true;
    } catch (error) {
      console.error('Error sending email verification:', error);
      return false;
    }
  }

  async verifyEmailCode(email: string, code: string): Promise<boolean> {
    try {
      const result = await db.execute(sql`
        SELECT * FROM verification_codes
        WHERE email = ${email}
        AND code = ${code}
        AND expires_at > ${new Date()}
      `);

      if (result.rows.length === 0) {
        return false;
      }

      // Mark as used
      await db.execute(sql`
        DELETE FROM verification_codes
        WHERE email = ${email}
        AND code = ${code}
      `);

      return true;
    } catch (error) {
      console.error('Error verifying email code:', error);
      return false;
    }
  }

  async initiateOAuthFlow(platform: string, userId: number): Promise<OAuthResult> {
    try {
      const state = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      // Store state for verification
      const oauthState: OAuthState = {
        state,
        platform,
        userId,
        createdAt: new Date(),
        expiresAt
      };

      this.oauthStates.set(state, oauthState);

      // Get client ID from environment
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

      // Platform-specific parameters
      if (platform === 'twitter') {
        authUrl += '&code_challenge_method=S256';
        authUrl += '&code_challenge=challenge'; // In production, use PKCE
      }

      return {
        success: true,
        authUrl,
        state
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async handleOAuthCallback(platform: string, code: string, state: string): Promise<OAuthResult> {
    try {
      // Verify state
      const storedState = this.oauthStates.get(state);
      if (!storedState || storedState.platform !== platform) {
        throw new Error('Invalid state parameter');
      }

      if (storedState.expiresAt < new Date()) {
        throw new Error('OAuth state expired');
      }

      // Clean up state
      this.oauthStates.delete(state);

      // Exchange code for access token
      const tokenResult = await this.exchangeCodeForToken(platform, code);
      
      if (!tokenResult.success) {
        throw new Error(tokenResult.error || 'Token exchange failed');
      }

      // Store token in database
      await db.execute(sql`
        INSERT INTO platform_connections (user_id, platform, access_token, refresh_token, is_active)
        VALUES (${storedState.userId}, ${platform}, ${tokenResult.accessToken}, ${tokenResult.refreshToken}, true)
        ON CONFLICT (user_id, platform) DO UPDATE SET
          access_token = ${tokenResult.accessToken},
          refresh_token = ${tokenResult.refreshToken},
          is_active = true,
          connected_at = ${new Date()}
      `);

      return {
        success: true,
        state: 'connected'
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async exchangeCodeForToken(platform: string, code: string): Promise<{
    success: boolean;
    accessToken?: string;
    refreshToken?: string;
    error?: string;
  }> {
    try {
      const clientId = process.env[`${platform.toUpperCase()}_CLIENT_ID`];
      const clientSecret = process.env[`${platform.toUpperCase()}_CLIENT_SECRET`];
      
      if (!clientId || !clientSecret) {
        throw new Error(`Missing OAuth credentials for ${platform}`);
      }

      const redirectUri = `${process.env.BASE_URL || 'http://localhost:3000'}/api/auth/callback/${platform}`;

      let tokenUrl = '';
      let requestBody: any = {};

      switch (platform) {
        case 'twitter':
          tokenUrl = 'https://api.twitter.com/2/oauth2/token';
          requestBody = {
            code,
            grant_type: 'authorization_code',
            client_id: clientId,
            redirect_uri: redirectUri,
            code_verifier: 'challenge' // In production, use proper PKCE
          };
          break;
        case 'facebook':
          tokenUrl = 'https://graph.facebook.com/v18.0/oauth/access_token';
          requestBody = {
            client_id: clientId,
            client_secret: clientSecret,
            redirect_uri: redirectUri,
            code
          };
          break;
        case 'linkedin':
          tokenUrl = 'https://www.linkedin.com/oauth/v2/accessToken';
          requestBody = {
            grant_type: 'authorization_code',
            code,
            redirect_uri: redirectUri,
            client_id: clientId,
            client_secret: clientSecret
          };
          break;
        case 'youtube':
          tokenUrl = 'https://oauth2.googleapis.com/token';
          requestBody = {
            code,
            client_id: clientId,
            client_secret: clientSecret,
            redirect_uri: redirectUri,
            grant_type: 'authorization_code'
          };
          break;
        default:
          throw new Error(`Unsupported platform: ${platform}`);
      }

      const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams(requestBody)
      });

      if (!response.ok) {
        throw new Error(`Token exchange failed: ${response.statusText}`);
      }

      const data = await response.json();

      return {
        success: true,
        accessToken: data.access_token,
        refreshToken: data.refresh_token
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async refreshToken(platform: string, refreshToken: string): Promise<{
    success: boolean;
    accessToken?: string;
    refreshToken?: string;
    error?: string;
  }> {
    try {
      const clientId = process.env[`${platform.toUpperCase()}_CLIENT_ID`];
      const clientSecret = process.env[`${platform.toUpperCase()}_CLIENT_SECRET`];

      if (!clientId || !clientSecret) {
        throw new Error(`Missing OAuth credentials for ${platform}`);
      }

      let tokenUrl = '';
      let requestBody: any = {};

      switch (platform) {
        case 'twitter':
          tokenUrl = 'https://api.twitter.com/2/oauth2/token';
          requestBody = {
            refresh_token: refreshToken,
            grant_type: 'refresh_token',
            client_id: clientId
          };
          break;
        case 'facebook':
          tokenUrl = 'https://graph.facebook.com/v18.0/oauth/access_token';
          requestBody = {
            grant_type: 'fb_exchange_token',
            client_id: clientId,
            client_secret: clientSecret,
            fb_exchange_token: refreshToken
          };
          break;
        case 'linkedin':
          tokenUrl = 'https://www.linkedin.com/oauth/v2/accessToken';
          requestBody = {
            grant_type: 'refresh_token',
            refresh_token: refreshToken,
            client_id: clientId,
            client_secret: clientSecret
          };
          break;
        case 'youtube':
          tokenUrl = 'https://oauth2.googleapis.com/token';
          requestBody = {
            refresh_token: refreshToken,
            client_id: clientId,
            client_secret: clientSecret,
            grant_type: 'refresh_token'
          };
          break;
        default:
          throw new Error(`Unsupported platform: ${platform}`);
      }

      const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams(requestBody)
      });

      if (!response.ok) {
        throw new Error(`Token refresh failed: ${response.statusText}`);
      }

      const data = await response.json();

      return {
        success: true,
        accessToken: data.access_token,
        refreshToken: data.refresh_token || refreshToken
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async getPlatformTokens(userId: number): Promise<Record<string, string>> {
    try {
      const result = await db.execute(sql`
        SELECT platform, access_token
        FROM platform_connections
        WHERE user_id = ${userId}
        AND is_active = true
      `);

      const tokens: Record<string, string> = {};
      for (const row of result.rows) {
        tokens[row.platform] = row.access_token;
      }

      return tokens;
    } catch (error) {
      console.error('Error getting platform tokens:', error);
      return {};
    }
  }

  async validateToken(platform: string, token: string): Promise<boolean> {
    try {
      let validationUrl = '';
      let headers: Record<string, string> = {};

      switch (platform) {
        case 'twitter':
          validationUrl = 'https://api.twitter.com/2/users/me';
          headers = { 'Authorization': `Bearer ${token}` };
          break;
        case 'facebook':
          validationUrl = `https://graph.facebook.com/me?access_token=${token}`;
          break;
        case 'linkedin':
          validationUrl = 'https://api.linkedin.com/v2/me';
          headers = { 'Authorization': `Bearer ${token}` };
          break;
        case 'youtube':
          validationUrl = 'https://www.googleapis.com/oauth2/v1/tokeninfo';
          headers = { 'Authorization': `Bearer ${token}` };
          break;
        default:
          return false;
      }

      const response = await fetch(validationUrl, { headers });
      return response.ok;
    } catch (error) {
      console.error('Error validating token:', error);
      return false;
    }
  }

  // Cleanup expired states
  private cleanup(): void {
    const now = new Date();
    for (const [state, oauthState] of this.oauthStates.entries()) {
      if (oauthState.expiresAt < now) {
        this.oauthStates.delete(state);
      }
    }
  }
}

export const replitAuthManager = new ReplitAuthManager();

// Cleanup expired states every 5 minutes
setInterval(() => {
  (replitAuthManager as any).cleanup();
}, 5 * 60 * 1000);