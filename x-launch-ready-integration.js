/**
 * X Platform Launch-Ready Integration
 * Supports both OAuth 2.0 and OAuth 1.0a with automatic fallback
 */

class XLaunchReadyIntegration {
  constructor() {
    this.oauth2Token = process.env.X_OAUTH2_ACCESS_TOKEN;
    this.consumerKey = process.env.X_0AUTH_CLIENT_ID;
    this.consumerSecret = process.env.X_0AUTH_CLIENT_SECRET;
    this.accessToken = process.env.X_ACCESS_TOKEN;
    this.tokenSecret = process.env.X_ACCESS_TOKEN_SECRET;
  }

  percentEncode(str) {
    return encodeURIComponent(str)
      .replace(/[!'()*]/g, function(c) {
        return '%' + c.charCodeAt(0).toString(16);
      });
  }

  generateOAuthSignature(method, url, params) {
    const sortedParams = Object.keys(params)
      .sort()
      .map(key => `${this.percentEncode(key)}=${this.percentEncode(params[key])}`)
      .join('&');

    const signatureBaseString = [
      method.toUpperCase(),
      this.percentEncode(url),
      this.percentEncode(sortedParams)
    ].join('&');

    const signingKey = `${this.percentEncode(this.consumerSecret)}&${this.percentEncode(this.tokenSecret)}`;
    
    const crypto = require('crypto');
    return crypto.createHmac('sha1', signingKey).update(signatureBaseString).digest('base64');
  }

  async postTweetOAuth2(text) {
    console.log('Attempting OAuth 2.0 posting...');
    
    try {
      const response = await fetch('https://api.twitter.com/2/tweets', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.oauth2Token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ text })
      });

      const result = await response.json();
      
      if (response.ok) {
        console.log('✅ OAuth 2.0 posting successful');
        return {
          success: true,
          tweetId: result.data.id,
          method: 'OAuth 2.0'
        };
      } else {
        console.log('❌ OAuth 2.0 failed:', result);
        return { success: false, error: result };
      }
    } catch (error) {
      console.log('❌ OAuth 2.0 error:', error.message);
      return { success: false, error: error.message };
    }
  }

  async postTweetOAuth1(text) {
    console.log('Attempting OAuth 1.0a posting...');
    
    const url = 'https://api.twitter.com/1.1/statuses/update.json';
    const timestamp = Math.floor(Date.now() / 1000);
    const crypto = require('crypto');
    const nonce = crypto.randomBytes(16).toString('hex');

    const oauthParams = {
      oauth_consumer_key: this.consumerKey,
      oauth_token: this.accessToken,
      oauth_signature_method: 'HMAC-SHA1',
      oauth_timestamp: timestamp,
      oauth_nonce: nonce,
      oauth_version: '1.0',
      status: text
    };

    const signature = this.generateOAuthSignature('POST', url, oauthParams);
    oauthParams.oauth_signature = signature;

    const authHeader = 'OAuth ' + Object.keys(oauthParams)
      .filter(key => key.startsWith('oauth_'))
      .map(key => `${key}="${this.percentEncode(oauthParams[key])}"`)
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
        console.log('✅ OAuth 1.0a posting successful');
        return {
          success: true,
          tweetId: result.id_str,
          method: 'OAuth 1.0a'
        };
      } else {
        console.log('❌ OAuth 1.0a failed:', result);
        return { success: false, error: result };
      }
    } catch (error) {
      console.log('❌ OAuth 1.0a error:', error.message);
      return { success: false, error: error.message };
    }
  }

  async postTweet(text) {
    console.log('🔄 X Platform Integration Test');
    console.log('==============================');

    // Try OAuth 2.0 first (preferred method)
    if (this.oauth2Token) {
      const oauth2Result = await this.postTweetOAuth2(text);
      if (oauth2Result.success) {
        return oauth2Result;
      }
    }

    // Fallback to OAuth 1.0a
    if (this.consumerKey && this.consumerSecret && this.accessToken && this.tokenSecret) {
      const oauth1Result = await this.postTweetOAuth1(text);
      if (oauth1Result.success) {
        return oauth1Result;
      }
    }

    return {
      success: false,
      error: 'Both OAuth 2.0 and OAuth 1.0a failed'
    };
  }

  async testConnection() {
    const testText = 'TheAgencyIQ X platform connection test - verifying launch readiness!';
    return await this.postTweet(testText);
  }

  getStatus() {
    return {
      oauth2Available: !!this.oauth2Token,
      oauth1Available: !!(this.consumerKey && this.consumerSecret && this.accessToken && this.tokenSecret),
      preferredMethod: this.oauth2Token ? 'OAuth 2.0' : 'OAuth 1.0a'
    };
  }
}

// Test the integration
async function testXIntegration() {
  const xIntegration = new XLaunchReadyIntegration();
  
  console.log('X Platform Status:', xIntegration.getStatus());
  
  const result = await xIntegration.testConnection();
  
  if (result.success) {
    console.log(`✅ X PLATFORM OPERATIONAL (${result.method})`);
    console.log(`Tweet ID: ${result.tweetId}`);
    console.log('✅ READY FOR 9:00 AM JST LAUNCH');
  } else {
    console.log('❌ X PLATFORM FAILED');
    console.log('Error:', result.error);
  }
  
  return result;
}

testXIntegration();