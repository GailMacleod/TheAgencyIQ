/**
 * Backend OAuth Token Manager
 * Handles token refresh, revocation, and scope management
 */

import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as FacebookStrategy } from 'passport-facebook';
import { Strategy as LinkedInStrategy } from 'passport-linkedin-oauth2';

export class TokenManager {
  constructor(storage) {
    this.storage = storage;
    this.refreshTokens = new Map(); // In-memory refresh token cache
    this.setupStrategies();
  }

  /**
   * Setup Passport OAuth strategies
   */
  setupStrategies() {
    // Google OAuth Strategy
    if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
      passport.use(new GoogleStrategy({
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: "/auth/google/callback"
      }, this.handleOAuthCallback.bind(this, 'google')));
    }

    // Facebook OAuth Strategy  
    if (process.env.FACEBOOK_CLIENT_ID && process.env.FACEBOOK_CLIENT_SECRET) {
      passport.use(new FacebookStrategy({
        clientID: process.env.FACEBOOK_CLIENT_ID,
        clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
        callbackURL: "/auth/facebook/callback"
      }, this.handleOAuthCallback.bind(this, 'facebook')));
    }

    // LinkedIn OAuth Strategy
    if (process.env.LINKEDIN_CLIENT_ID && process.env.LINKEDIN_CLIENT_SECRET) {
      passport.use(new LinkedInStrategy({
        clientID: process.env.LINKEDIN_CLIENT_ID,
        clientSecret: process.env.LINKEDIN_CLIENT_SECRET,
        callbackURL: "/auth/linkedin/callback",
        scope: ['r_emailaddress', 'r_liteprofile', 'w_member_social']
      }, this.handleOAuthCallback.bind(this, 'linkedin')));
    }
  }

  /**
   * Handle OAuth callback and store tokens
   */
  async handleOAuthCallback(provider, accessToken, refreshToken, profile, done) {
    try {
      const tokenData = {
        accessToken,
        refreshToken,
        expiresAt: Date.now() + (3600 * 1000), // 1 hour default
        scope: profile.scope || [],
        provider,
        profileId: profile.id,
        email: profile.emails?.[0]?.value
      };

      // Store token in database
      await this.storage.storeOAuthToken(profile.id, provider, tokenData);
      
      // Cache refresh token
      if (refreshToken) {
        this.refreshTokens.set(`${provider}:${profile.id}`, refreshToken);
      }

      console.log(`✅ OAuth token stored for ${provider}:${profile.id}`);
      return done(null, { provider, profileId: profile.id, tokenData });
    } catch (error) {
      console.error(`❌ OAuth callback failed for ${provider}:`, error);
      return done(error);
    }
  }

  /**
   * Refresh access token
   */
  async refreshAccessToken(userId, provider) {
    try {
      const storedToken = await this.storage.getOAuthToken(userId, provider);
      
      if (!storedToken?.refreshToken) {
        throw new Error(`No refresh token available for ${provider}`);
      }

      let newTokenData;
      
      switch (provider) {
        case 'google':
          newTokenData = await this.refreshGoogleToken(storedToken.refreshToken);
          break;
        case 'facebook':
          newTokenData = await this.refreshFacebookToken(storedToken.accessToken);
          break;
        case 'linkedin':
          newTokenData = await this.refreshLinkedInToken(storedToken.refreshToken);
          break;
        default:
          throw new Error(`Token refresh not implemented for ${provider}`);
      }

      // Update stored token
      const updatedToken = {
        ...storedToken,
        accessToken: newTokenData.accessToken,
        refreshToken: newTokenData.refreshToken || storedToken.refreshToken,
        expiresAt: Date.now() + (newTokenData.expiresIn * 1000),
        scope: newTokenData.scope || storedToken.scope
      };

      await this.storage.storeOAuthToken(userId, provider, updatedToken);
      
      console.log(`✅ Token refreshed for ${provider}:${userId}`);
      return updatedToken;
    } catch (error) {
      console.error(`❌ Token refresh failed for ${provider}:${userId}:`, error);
      throw error;
    }
  }

  /**
   * Refresh Google OAuth token
   */
  async refreshGoogleToken(refreshToken) {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        refresh_token: refreshToken,
        grant_type: 'refresh_token'
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Google token refresh failed: ${error}`);
    }

    return await response.json();
  }

  /**
   * Refresh Facebook OAuth token
   */
  async refreshFacebookToken(accessToken) {
    const response = await fetch(`https://graph.facebook.com/oauth/access_token?` + 
      new URLSearchParams({
        grant_type: 'fb_exchange_token',
        client_id: process.env.FACEBOOK_CLIENT_ID,
        client_secret: process.env.FACEBOOK_CLIENT_SECRET,
        fb_exchange_token: accessToken
      })
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Facebook token refresh failed: ${error}`);
    }

    const data = await response.json();
    return {
      accessToken: data.access_token,
      expiresIn: data.expires_in || 3600
    };
  }

  /**
   * Refresh LinkedIn OAuth token
   */
  async refreshLinkedInToken(refreshToken) {
    const response = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: process.env.LINKEDIN_CLIENT_ID,
        client_secret: process.env.LINKEDIN_CLIENT_SECRET
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`LinkedIn token refresh failed: ${error}`);
    }

    return await response.json();
  }

  /**
   * Revoke OAuth token
   */
  async revokeToken(userId, provider) {
    try {
      const storedToken = await this.storage.getOAuthToken(userId, provider);
      
      if (!storedToken) {
        console.warn(`No token found to revoke for ${provider}:${userId}`);
        return true;
      }

      // Revoke at provider
      switch (provider) {
        case 'google':
          await this.revokeGoogleToken(storedToken.accessToken);
          break;
        case 'facebook':
          await this.revokeFacebookToken(storedToken.accessToken);
          break;
        case 'linkedin':
          // LinkedIn doesn't have a revocation endpoint
          console.log('LinkedIn token marked for expiry');
          break;
        default:
          console.warn(`Token revocation not implemented for ${provider}`);
      }

      // Remove from storage
      await this.storage.removeOAuthToken(userId, provider);
      this.refreshTokens.delete(`${provider}:${userId}`);
      
      console.log(`✅ Token revoked for ${provider}:${userId}`);
      return true;
    } catch (error) {
      console.error(`❌ Token revocation failed for ${provider}:${userId}:`, error);
      return false;
    }
  }

  /**
   * Revoke Google token
   */
  async revokeGoogleToken(accessToken) {
    const response = await fetch(`https://oauth2.googleapis.com/revoke?token=${accessToken}`, {
      method: 'POST'
    });

    if (!response.ok) {
      throw new Error(`Google token revocation failed: ${response.statusText}`);
    }
  }

  /**
   * Revoke Facebook token
   */
  async revokeFacebookToken(accessToken) {
    const response = await fetch(`https://graph.facebook.com/me/permissions?access_token=${accessToken}`, {
      method: 'DELETE'
    });

    if (!response.ok) {
      throw new Error(`Facebook token revocation failed: ${response.statusText}`);
    }
  }

  /**
   * Get all tokens for user
   */
  async getUserTokens(userId) {
    try {
      return await this.storage.getUserOAuthTokens(userId);
    } catch (error) {
      console.error(`Failed to get user tokens for ${userId}:`, error);
      return {};
    }
  }

  /**
   * Check if token needs refresh
   */
  tokenNeedsRefresh(token, bufferMinutes = 5) {
    if (!token || !token.expiresAt) return true;
    
    const bufferMs = bufferMinutes * 60 * 1000;
    return Date.now() + bufferMs >= token.expiresAt;
  }

  /**
   * Get valid token with automatic refresh
   */
  async getValidToken(userId, provider) {
    try {
      const token = await this.storage.getOAuthToken(userId, provider);
      
      if (!token) {
        return null;
      }

      if (this.tokenNeedsRefresh(token)) {
        console.log(`🔄 Auto-refreshing token for ${provider}:${userId}`);
        return await this.refreshAccessToken(userId, provider);
      }

      return token;
    } catch (error) {
      console.error(`Failed to get valid token for ${provider}:${userId}:`, error);
      return null;
    }
  }
}

export default TokenManager;