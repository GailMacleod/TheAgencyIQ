/**
 * X Platform Integration using OAuth 1.0a
 * Handles posting to X with proper authentication
 */

import crypto from 'crypto';

export class XIntegration {
  private consumerKey: string;
  private consumerSecret: string;
  private accessToken: string;
  private accessTokenSecret: string;

  constructor() {
    this.consumerKey = process.env.X_0AUTH_CLIENT_ID!;
    this.consumerSecret = process.env.X_0AUTH_CLIENT_SECRET!;
    this.accessToken = process.env.X_ACCESS_TOKEN!;
    this.accessTokenSecret = process.env.X_ACCESS_TOKEN_SECRET!;
  }

  private generateOAuthSignature(method: string, url: string, params: Record<string, string>): string {
    // Sort parameters
    const sortedParams = Object.keys(params)
      .sort()
      .map(key => `${this.percentEncode(key)}=${this.percentEncode(params[key])}`)
      .join('&');

    // Create signature base string
    const baseString = `${method}&${this.percentEncode(url)}&${this.percentEncode(sortedParams)}`;
    
    // Create signing key
    const signingKey = `${this.percentEncode(this.consumerSecret)}&${this.percentEncode(this.accessTokenSecret)}`;
    
    // Generate signature
    const signature = crypto
      .createHmac('sha1', signingKey)
      .update(baseString)
      .digest('base64');

    return signature;
  }

  private percentEncode(str: string): string {
    return encodeURIComponent(str)
      .replace(/[!'()*]/g, (c) => '%' + c.charCodeAt(0).toString(16).toUpperCase());
  }

  async postTweet(text: string): Promise<{ success: boolean; data?: any; error?: string }> {
    const url = 'https://api.twitter.com/2/tweets';
    const method = 'POST';
    
    // OAuth 1.0a parameters
    const oauthParams: Record<string, string> = {
      oauth_consumer_key: this.consumerKey,
      oauth_token: this.accessToken,
      oauth_signature_method: 'HMAC-SHA1',
      oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
      oauth_nonce: crypto.randomBytes(16).toString('hex'),
      oauth_version: '1.0'
    };

    // Generate signature
    const signature = this.generateOAuthSignature(method, url, oauthParams);
    oauthParams.oauth_signature = signature;

    // Create authorization header
    const authHeader = 'OAuth ' + Object.keys(oauthParams)
      .map(key => `${key}="${this.percentEncode(oauthParams[key])}"`)
      .join(', ');

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ text })
      });

      const result = await response.json();

      if (response.ok) {
        return {
          success: true,
          data: {
            id: result.data.id,
            text: result.data.text,
            url: `https://twitter.com/i/web/status/${result.data.id}`
          }
        };
      } else {
        return {
          success: false,
          error: `X API Error: ${response.status} - ${JSON.stringify(result)}`
        };
      }
    } catch (error) {
      return {
        success: false,
        error: `Network error: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      const result = await this.postTweet('TheAgencyIQ X integration test - connection verified!');
      return { success: result.success, error: result.error };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

export const xIntegration = new XIntegration();