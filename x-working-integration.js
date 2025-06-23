/**
 * Working X Integration using Twitter API v1.1
 * More compatible with existing OAuth 1.0a credentials
 */

import crypto from 'crypto';

class XWorkingIntegration {
  constructor() {
    this.consumerKey = process.env.X_0AUTH_CLIENT_ID;
    this.consumerSecret = process.env.X_0AUTH_CLIENT_SECRET;
    this.accessToken = process.env.X_ACCESS_TOKEN;
    this.accessTokenSecret = process.env.X_ACCESS_TOKEN_SECRET;
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
    
    const signature = crypto
      .createHmac('sha1', signingKey)
      .update(baseString)
      .digest('base64');

    return signature;
  }

  async postTweet(text) {
    console.log('🔄 X WORKING INTEGRATION TEST');
    console.log('=============================');

    // Use Twitter API v1.1 which is more stable with OAuth 1.0a
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
    
    // Remove status from OAuth header params
    const authParams = { ...oauthParams };
    delete authParams.status;
    authParams.oauth_signature = signature;

    const authHeader = 'OAuth ' + Object.keys(authParams)
      .map(key => `${key}="${this.percentEncode(authParams[key])}"`)
      .join(', ');

    console.log('📡 Posting to Twitter API v1.1...');

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
      console.log('Response Status:', response.status);

      if (response.ok) {
        console.log('✅ X PLATFORM INTEGRATION SUCCESSFUL');
        console.log('Tweet ID:', result.id_str);
        console.log('Tweet URL: https://twitter.com/i/web/status/' + result.id_str);
        console.log('✅ READY FOR 9:00 AM JST LAUNCH');
        return {
          success: true,
          data: {
            id: result.id_str,
            text: result.text,
            url: `https://twitter.com/i/web/status/${result.id_str}`
          }
        };
      } else {
        console.log('❌ X posting failed');
        console.log('Error:', JSON.stringify(result, null, 2));
        
        // Check for specific error types
        if (result.errors && result.errors[0]) {
          const error = result.errors[0];
          if (error.code === 89) {
            console.log('🔧 SOLUTION: Access token needs refresh or regeneration');
          } else if (error.code === 187) {
            console.log('🔧 SOLUTION: Duplicate status - tweet already posted');
          }
        }
        
        return {
          success: false,
          error: `X API Error: ${response.status} - ${JSON.stringify(result)}`
        };
      }
    } catch (error) {
      console.log('💥 Network error:', error.message);
      return {
        success: false,
        error: `Network error: ${error.message}`
      };
    }
  }

  async testConnection() {
    // Test with unique content to avoid duplicate errors
    const timestamp = new Date().toISOString();
    return await this.postTweet(`TheAgencyIQ X integration test ${timestamp} - Platform ready for launch!`);
  }
}

const xWorking = new XWorkingIntegration();
xWorking.testConnection();