/**
 * REAL PUBLISHING TEST - All 5 Platforms
 * Tests actual API publishing to Facebook, Instagram, LinkedIn, X, YouTube
 * Verifies real post IDs are returned from platform APIs
 */

const axios = require('axios');

class RealPublishingTester {
  constructor() {
    this.results = {
      facebook: { success: false, postId: null, error: null },
      instagram: { success: false, postId: null, error: null },
      linkedin: { success: false, postId: null, error: null },
      x: { success: false, postId: null, error: null },
      youtube: { success: false, postId: null, error: null }
    };
  }

  async testAllPlatforms() {
    console.log('🚀 REAL PUBLISHING TEST - Testing all 5 platforms with actual APIs');
    
    // Import database and get active connections
    const { db } = await import('./server/db.js');
    const { platformConnections } = await import('./shared/schema.js');
    const { eq } = await import('drizzle-orm');
    
    // Get all active platform connections
    const connections = await db.select().from(platformConnections).where(eq(platformConnections.isActive, true));
    
    console.log(`Found ${connections.length} active platform connections`);
    
    const testContent = `TEST POST ${new Date().toISOString()} - Real API Publishing Test from TheAgencyIQ`;
    
    // Test each platform
    for (const connection of connections) {
      console.log(`\n📤 Testing ${connection.platform} publishing...`);
      
      try {
        let result;
        
        switch (connection.platform) {
          case 'facebook':
            result = await this.testFacebookPublishing(testContent, connection);
            break;
          case 'instagram':
            result = await this.testInstagramPublishing(testContent, connection);
            break;
          case 'linkedin':
            result = await this.testLinkedInPublishing(testContent, connection);
            break;
          case 'x':
            result = await this.testXPublishing(testContent, connection);
            break;
          case 'youtube':
            result = await this.testYouTubePublishing(testContent, connection);
            break;
          default:
            console.log(`❌ Unknown platform: ${connection.platform}`);
            continue;
        }
        
        this.results[connection.platform] = result;
        
        if (result.success) {
          console.log(`✅ ${connection.platform} SUCCESS: Post ID ${result.postId}`);
        } else {
          console.log(`❌ ${connection.platform} FAILED: ${result.error}`);
        }
        
      } catch (error) {
        console.log(`❌ ${connection.platform} ERROR: ${error.message}`);
        this.results[connection.platform] = {
          success: false,
          postId: null,
          error: error.message
        };
      }
    }
    
    this.generateReport();
  }

  async testFacebookPublishing(content, connection) {
    try {
      const response = await axios.post(
        `https://graph.facebook.com/v18.0/me/feed`,
        {
          message: content,
          access_token: connection.accessToken
        }
      );
      
      if (response.data && response.data.id) {
        return { success: true, postId: response.data.id, error: null };
      } else {
        return { success: false, postId: null, error: 'No post ID returned' };
      }
    } catch (error) {
      return { success: false, postId: null, error: error.response?.data?.error?.message || error.message };
    }
  }

  async testInstagramPublishing(content, connection) {
    try {
      // Get Instagram account ID
      const accountResponse = await axios.get(
        `https://graph.instagram.com/me/accounts?access_token=${connection.accessToken}`
      );
      
      if (!accountResponse.data.data || accountResponse.data.data.length === 0) {
        return { success: false, postId: null, error: 'No Instagram business account found' };
      }
      
      const instagramAccountId = accountResponse.data.data[0].id;
      
      // Create Instagram media
      const mediaResponse = await axios.post(
        `https://graph.instagram.com/v18.0/${instagramAccountId}/media`,
        {
          caption: content,
          image_url: 'https://images.unsplash.com/photo-1611224923853-80b023f02d71?w=1080&h=1080&fit=crop',
          access_token: connection.accessToken
        }
      );
      
      if (!mediaResponse.data.id) {
        return { success: false, postId: null, error: 'Failed to create Instagram media' };
      }
      
      // Publish the media
      const publishResponse = await axios.post(
        `https://graph.instagram.com/v18.0/${instagramAccountId}/media_publish`,
        {
          creation_id: mediaResponse.data.id,
          access_token: connection.accessToken
        }
      );
      
      if (publishResponse.data && publishResponse.data.id) {
        return { success: true, postId: publishResponse.data.id, error: null };
      } else {
        return { success: false, postId: null, error: 'Instagram publish failed' };
      }
      
    } catch (error) {
      return { success: false, postId: null, error: error.response?.data?.error?.message || error.message };
    }
  }

  async testLinkedInPublishing(content, connection) {
    try {
      // Get LinkedIn person ID
      const profileResponse = await axios.get(
        'https://api.linkedin.com/v2/people/~',
        {
          headers: {
            'Authorization': `Bearer ${connection.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      const personId = profileResponse.data.id;
      
      // Create LinkedIn share
      const shareResponse = await axios.post(
        'https://api.linkedin.com/v2/shares',
        {
          owner: `urn:li:person:${personId}`,
          text: {
            text: content
          },
          distribution: {
            linkedInDistributionTarget: {}
          }
        },
        {
          headers: {
            'Authorization': `Bearer ${connection.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (shareResponse.data && shareResponse.data.id) {
        return { success: true, postId: shareResponse.data.id, error: null };
      } else {
        return { success: false, postId: null, error: 'LinkedIn share failed' };
      }
      
    } catch (error) {
      return { success: false, postId: null, error: error.response?.data?.message || error.message };
    }
  }

  async testXPublishing(content, connection) {
    try {
      const OAuth = require('oauth-1.0a');
      const crypto = require('crypto');
      
      // Set up OAuth 1.0a
      const oauth = OAuth({
        consumer: {
          key: process.env.X_CONSUMER_KEY,
          secret: process.env.X_CONSUMER_SECRET
        },
        signature_method: 'HMAC-SHA1',
        hash_function(base_string, key) {
          return crypto.createHmac('sha1', key).update(base_string).digest('base64');
        }
      });
      
      const requestData = {
        url: 'https://api.twitter.com/2/tweets',
        method: 'POST'
      };
      
      const token = {
        key: connection.accessToken,
        secret: connection.tokenSecret
      };
      
      const tweetResponse = await axios.post(
        'https://api.twitter.com/2/tweets',
        {
          text: content.substring(0, 280)
        },
        {
          headers: {
            ...oauth.toHeader(oauth.authorize(requestData, token)),
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (tweetResponse.data && tweetResponse.data.data && tweetResponse.data.data.id) {
        return { success: true, postId: tweetResponse.data.data.id, error: null };
      } else {
        return { success: false, postId: null, error: 'X tweet failed' };
      }
      
    } catch (error) {
      return { success: false, postId: null, error: error.response?.data?.detail || error.message };
    }
  }

  async testYouTubePublishing(content, connection) {
    try {
      const communityResponse = await axios.post(
        'https://www.googleapis.com/youtube/v3/activities',
        {
          snippet: {
            description: content
          },
          status: {
            privacyStatus: 'public'
          }
        },
        {
          headers: {
            'Authorization': `Bearer ${connection.accessToken}`,
            'Content-Type': 'application/json'
          },
          params: {
            part: 'snippet,status'
          }
        }
      );
      
      if (communityResponse.data && communityResponse.data.id) {
        return { success: true, postId: communityResponse.data.id, error: null };
      } else {
        return { success: false, postId: null, error: 'YouTube community post failed' };
      }
      
    } catch (error) {
      return { success: false, postId: null, error: error.response?.data?.error?.message || error.message };
    }
  }

  generateReport() {
    console.log('\n📊 REAL PUBLISHING TEST RESULTS');
    console.log('=====================================');
    
    let successCount = 0;
    let totalCount = 0;
    
    for (const [platform, result] of Object.entries(this.results)) {
      if (result.success !== false || result.error !== null) {
        totalCount++;
        console.log(`${platform.toUpperCase()}:`);
        console.log(`  Success: ${result.success ? '✅' : '❌'}`);
        console.log(`  Post ID: ${result.postId || 'N/A'}`);
        console.log(`  Error: ${result.error || 'None'}`);
        console.log('');
        
        if (result.success) successCount++;
      }
    }
    
    console.log(`SUMMARY: ${successCount}/${totalCount} platforms successful`);
    console.log('=====================================');
    
    // Save results to file
    const fs = require('fs');
    const timestamp = new Date().toISOString();
    const reportData = {
      timestamp,
      totalPlatforms: totalCount,
      successfulPlatforms: successCount,
      results: this.results
    };
    
    fs.writeFileSync('real-publishing-test-results.json', JSON.stringify(reportData, null, 2));
    console.log('📁 Results saved to real-publishing-test-results.json');
  }
}

// Run the test
const tester = new RealPublishingTester();
tester.testAllPlatforms().catch(console.error);