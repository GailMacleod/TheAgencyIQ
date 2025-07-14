/**
 * REAL PUBLISHING TEST - All 5 Platforms
 * Tests actual API publishing using ONLY stored OAuth connections
 * NO FALLBACK CREDENTIALS - Security First
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
    console.log('🚀 REAL PUBLISHING TEST - Using ONLY stored OAuth connections');
    
    // Use DirectPublisher to test real API publishing
    const { DirectPublisher } = await import('./server/direct-publisher.ts');
    
    const testContent = `TEST POST ${new Date().toISOString()} - Real API Publishing Test from TheAgencyIQ`;
    
    const platforms = ['facebook', 'instagram', 'linkedin', 'x', 'youtube'];
    
    console.log('Testing each platform with stored OAuth connections...');
    
    // Test each platform using DirectPublisher
    for (const platform of platforms) {
      console.log(`\n📤 Testing ${platform} publishing...`);
      
      try {
        let result;
        
        switch (platform) {
          case 'facebook':
            result = await DirectPublisher.publishToFacebook(testContent);
            break;
          case 'instagram':
            result = await DirectPublisher.publishToInstagram(testContent);
            break;
          case 'linkedin':
            result = await DirectPublisher.publishToLinkedIn(testContent);
            break;
          case 'x':
            result = await DirectPublisher.publishToTwitter(testContent);
            break;
          case 'youtube':
            result = await DirectPublisher.publishToYouTube(testContent);
            break;
          default:
            console.log(`❌ Unknown platform: ${platform}`);
            continue;
        }
        
        this.results[platform] = {
          success: result.success,
          postId: result.platformPostId,
          error: result.error
        };
        
        if (result.success) {
          console.log(`✅ ${platform} SUCCESS: Post ID ${result.platformPostId}`);
        } else {
          console.log(`❌ ${platform} FAILED: ${result.error}`);
        }
        
      } catch (error) {
        console.log(`❌ ${platform} ERROR: ${error.message}`);
        this.results[platform] = {
          success: false,
          postId: null,
          error: error.message
        };
      }
    }
    
    this.generateReport();
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
      results: this.results,
      note: 'Using ONLY stored OAuth connections - NO fallback credentials'
    };
    
    fs.writeFileSync('real-publishing-test-results.json', JSON.stringify(reportData, null, 2));
    console.log('📁 Results saved to real-publishing-test-results.json');
  }
}

// Run the test
const tester = new RealPublishingTester();
tester.testAllPlatforms().catch(console.error);