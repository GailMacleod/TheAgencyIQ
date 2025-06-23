/**
 * X Platform Launch-Ready Integration
 * Supports both OAuth 2.0 and OAuth 1.0a with automatic fallback
 */

import crypto from 'crypto';

class XLaunchReadyIntegration {
  constructor() {
    this.consumerKey = process.env.X_0AUTH_CLIENT_ID;
    this.consumerSecret = process.env.X_0AUTH_CLIENT_SECRET;
    this.accessToken = process.env.X_ACCESS_TOKEN;
    this.accessTokenSecret = process.env.X_ACCESS_TOKEN_SECRET;
    this.userAccessToken = process.env.X_USER_ACCESS_TOKEN;
  }

  percentEncode(str) {
    return encodeURIComponent(str)
      .replace(/[!'()*]/g, (c) => '%' + c.charCodeAt(0).toString(16).toUpperCase());
  }

  generateOAuthSignature(method, url, params) {
    const sortedParams = Object.keys(params)
      .sort()
      .map(key => `${this.percentEncode(key)}=${this.percentEncode(params[key])}`)
      .join('&');

    const baseString = `${method}&${this.percentEncode(url)}&${this.percentEncode(sortedParams)}`;
    const signingKey = `${this.percentEncode(this.consumerSecret)}&${this.percentEncode(this.accessTokenSecret)}`;
    
    return crypto.createHmac('sha1', signingKey).update(baseString).digest('base64');
  }

  async postTweetOAuth2(text) {
    if (!this.userAccessToken) {
      return { success: false, error: 'OAuth 2.0 token not available' };
    }

    try {
      const response = await fetch('https://api.twitter.com/2/tweets', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.userAccessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ text })
      });

      const result = await response.json();
      
      if (response.ok) {
        return {
          success: true,
          method: 'OAuth 2.0',
          data: {
            id: result.data.id,
            text: result.data.text,
            url: `https://twitter.com/i/web/status/${result.data.id}`
          }
        };
      } else {
        return {
          success: false,
          error: `OAuth 2.0 Error: ${response.status} - ${JSON.stringify(result)}`
        };
      }
    } catch (error) {
      return {
        success: false,
        error: `OAuth 2.0 Network Error: ${error.message}`
      };
    }
  }

  async postTweetOAuth1(text) {
    if (!this.consumerKey || !this.consumerSecret || !this.accessToken || !this.accessTokenSecret) {
      return { success: false, error: 'OAuth 1.0a credentials not available' };
    }

    const url = 'https://api.twitter.com/1.1/statuses/update.json';
    const method = 'POST';
    
    const oauthParams = {
      oauth_consumer_key: this.consumerKey,
      oauth_token: this.accessToken,
      oauth_signature_method: 'HMAC-SHA1',
      oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
      oauth_nonce: crypto.randomBytes(16).toString('hex'),
      oauth_version: '1.0',
      status: text
    };

    const signature = this.generateOAuthSignature(method, url, oauthParams);
    
    const authParams = { ...oauthParams };
    delete authParams.status;
    authParams.oauth_signature = signature;

    const authHeader = 'OAuth ' + Object.keys(authParams)
      .map(key => `${key}="${this.percentEncode(authParams[key])}"`)
      .join(', ');

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: `status=${encodeURIComponent(text)}`
      });

      const result = await response.json();
      
      if (response.ok) {
        return {
          success: true,
          method: 'OAuth 1.0a',
          data: {
            id: result.id_str,
            text: result.text,
            url: `https://twitter.com/i/web/status/${result.id_str}`
          }
        };
      } else {
        return {
          success: false,
          error: `OAuth 1.0a Error: ${response.status} - ${JSON.stringify(result)}`
        };
      }
    } catch (error) {
      return {
        success: false,
        error: `OAuth 1.0a Network Error: ${error.message}`
      };
    }
  }

  async postTweet(text) {
    console.log('🔄 X Platform Posting Attempt');
    
    // Try OAuth 2.0 first (preferred method)
    const oauth2Result = await this.postTweetOAuth2(text);
    if (oauth2Result.success) {
      console.log(`✅ Posted via ${oauth2Result.method}`);
      return oauth2Result;
    }
    
    console.log('OAuth 2.0 failed, trying OAuth 1.0a...');
    
    // Fallback to OAuth 1.0a
    const oauth1Result = await this.postTweetOAuth1(text);
    if (oauth1Result.success) {
      console.log(`✅ Posted via ${oauth1Result.method}`);
      return oauth1Result;
    }
    
    console.log('❌ Both authentication methods failed');
    return {
      success: false,
      error: `All methods failed. OAuth 2.0: ${oauth2Result.error}. OAuth 1.0a: ${oauth1Result.error}`
    };
  }

  async testConnection() {
    return await this.postTweet(`TheAgencyIQ X integration test - ${new Date().toISOString()}`);
  }

  getStatus() {
    return {
      oauth2Available: !!this.userAccessToken,
      oauth1Available: !!(this.consumerKey && this.consumerSecret && this.accessToken && this.accessTokenSecret),
      ready: !!(this.userAccessToken || (this.consumerKey && this.consumerSecret && this.accessToken && this.accessTokenSecret))
    };
  }
}

// Test the integration
const xIntegration = new XLaunchReadyIntegration();
const status = xIntegration.getStatus();

console.log('🔍 X PLATFORM STATUS CHECK');
console.log('==========================');
console.log('OAuth 2.0 Available:', status.oauth2Available);
console.log('OAuth 1.0a Available:', status.oauth1Available);
console.log('Platform Ready:', status.ready);

if (status.ready) {
  console.log('🧪 Testing X posting...');
  xIntegration.testConnection();
} else {
  console.log('⚠️  X platform not ready - credentials needed');
  console.log('Required: X_USER_ACCESS_TOKEN (OAuth 2.0) OR X_ACCESS_TOKEN + X_ACCESS_TOKEN_SECRET (OAuth 1.0a)');
}

export default XLaunchReadyIntegration;