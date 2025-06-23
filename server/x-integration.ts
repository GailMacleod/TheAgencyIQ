/**
 * X Platform Integration Service
 * Handles X OAuth 2.0 and posting functionality
 */

import crypto from 'crypto';

interface XAuthResult {
  authUrl: string;
  codeVerifier: string;
  state: string;
}

interface XTokenResult {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
}

export class XIntegrationService {
  private clientId: string;
  private clientSecret: string;
  private redirectUri: string;

  constructor() {
    this.clientId = process.env.X_0AUTH_CLIENT_ID!;
    this.clientSecret = process.env.X_0AUTH_CLIENT_SECRET!;
    this.redirectUri = process.env.REPLIT_DOMAINS 
      ? `https://${process.env.REPLIT_DOMAINS}/` 
      : 'https://4fc77172-459a-4da7-8c33-5014abb1b73e-00-dqhtnud4ismj.worf.replit.dev/';
  }

  generateAuthUrl(): XAuthResult {
    // Generate PKCE parameters
    const codeVerifier = crypto.randomBytes(32).toString('base64url');
    const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url');
    const state = crypto.randomBytes(16).toString('hex');

    const authParams = new URLSearchParams({
      response_type: 'code',
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      scope: 'tweet.read tweet.write users.read offline.access',
      state: state,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256'
    });

    const authUrl = `https://twitter.com/i/oauth2/authorize?${authParams}`;

    return {
      authUrl,
      codeVerifier,
      state
    };
  }

  async exchangeCodeForToken(authCode: string, codeVerifier: string): Promise<XTokenResult | null> {
    const tokenParams = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: this.clientId,
      code: authCode,
      redirect_uri: this.redirectUri,
      code_verifier: codeVerifier
    });

    try {
      const response = await fetch('https://api.twitter.com/2/oauth2/token', {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: tokenParams
      });

      if (response.ok) {
        return await response.json();
      } else {
        console.error('Token exchange failed:', await response.text());
        return null;
      }
    } catch (error) {
      console.error('Token exchange error:', error);
      return null;
    }
  }

  async postTweet(accessToken: string, content: string): Promise<{ success: boolean; tweetId?: string; error?: string }> {
    try {
      const response = await fetch('https://api.twitter.com/2/tweets', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text: content
        })
      });

      const result = await response.json();

      if (response.ok) {
        return {
          success: true,
          tweetId: result.data.id
        };
      } else {
        return {
          success: false,
          error: result.detail || result.title || 'Unknown error'
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error'
      };
    }
  }

  async refreshToken(refreshToken: string): Promise<XTokenResult | null> {
    const tokenParams = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: this.clientId
    });

    try {
      const response = await fetch('https://api.twitter.com/2/oauth2/token', {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: tokenParams
      });

      if (response.ok) {
        return await response.json();
      } else {
        console.error('Token refresh failed:', await response.text());
        return null;
      }
    } catch (error) {
      console.error('Token refresh error:', error);
      return null;
    }
  }
}

export const xIntegration = new XIntegrationService();