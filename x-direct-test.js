/**
 * Direct X Integration Test - Bypasses server framework
 */

import crypto from 'crypto';

class XDirectTest {
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
    console.log('🔄 DIRECT X POSTING TEST');
    console.log('========================');
    console.log('Consumer Key:', this.consumerKey ? 'Present' : 'Missing');
    console.log('Consumer Secret:', this.consumerSecret ? 'Present' : 'Missing');
    console.log('Access Token:', this.accessToken ? 'Present' : 'Missing');
    console.log('Access Token Secret:', this.accessTokenSecret ? 'Present' : 'Missing');

    if (!this.consumerKey || !this.consumerSecret || !this.accessToken || !this.accessTokenSecret) {
      console.log('❌ Missing required X credentials');
      return { success: false, error: 'Missing credentials' };
    }

    const url = 'https://api.twitter.com/2/tweets';
    const method = 'POST';
    
    const oauthParams = {
      oauth_consumer_key: this.consumerKey,
      oauth_token: this.accessToken,
      oauth_signature_method: 'HMAC-SHA1',
      oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
      oauth_nonce: crypto.randomBytes(16).toString('hex'),
      oauth_version: '1.0'
    };

    const signature = this.generateOAuthSignature(method, url, oauthParams);
    oauthParams.oauth_signature = signature;

    const authHeader = 'OAuth ' + Object.keys(oauthParams)
      .map(key => `${key}="${this.percentEncode(oauthParams[key])}"`)
      .join(', ');

    console.log('📡 Posting to X API...');

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
      console.log('Response Status:', response.status);

      if (response.ok) {
        console.log('✅ X PLATFORM INTEGRATION SUCCESSFUL');
        console.log('Tweet ID:', result.data.id);
        console.log('Tweet URL: https://twitter.com/i/web/status/' + result.data.id);
        console.log('✅ READY FOR 9:00 AM JST LAUNCH');
        return {
          success: true,
          data: {
            id: result.data.id,
            text: result.data.text,
            url: `https://twitter.com/i/web/status/${result.data.id}`
          }
        };
      } else {
        console.log('❌ X posting failed');
        console.log('Error:', JSON.stringify(result, null, 2));
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
}

const xTest = new XDirectTest();
xTest.postTweet('TheAgencyIQ X platform DIRECT TEST - Integration complete! Ready for 9:00 AM JST launch! 🚀');