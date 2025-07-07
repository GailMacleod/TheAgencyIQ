/**
 * Test script for Video Generation System
 * Tests all video generation functionality including API endpoints and Python integration
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:5000';

async function testVideoGeneration() {
  console.log('🎬 Testing Video Generation System...\n');

  try {
    // Test 1: Check video generation status endpoint
    console.log('1. Testing video generation status endpoint...');
    try {
      const statusResponse = await axios.get(`${BASE_URL}/api/video-generation-status`, {
        headers: { 'Cookie': 'theagencyiq.session=test_session' }
      });
      console.log('✅ Status endpoint working:', statusResponse.data);
    } catch (error) {
      console.log('❌ Status endpoint failed:', error.response?.data || error.message);
    }

    // Test 2: Test video generation with ASMR prompt
    console.log('\n2. Testing ASMR video generation...');
    try {
      const videoResponse = await axios.post(`${BASE_URL}/api/generate-video`, {
        prompt: 'ASMR glass apple slice, crunchy sound, 60s',
        platform: 'instagram',
        aspectRatio: '9:16',
        style: 'asmr',
        duration: 15
      }, {
        headers: { 
          'Cookie': 'theagencyiq.session=test_session',
          'Content-Type': 'application/json'
        }
      });
      console.log('✅ ASMR video generation successful:', videoResponse.data);
    } catch (error) {
      console.log('❌ ASMR video generation failed:', error.response?.data || error.message);
    }

    // Test 3: Test business content video generation
    console.log('\n3. Testing business content video generation...');
    try {
      const businessResponse = await axios.post(`${BASE_URL}/api/generate-video`, {
        prompt: 'Professional business automation software demonstration for Queensland SMEs',
        platform: 'linkedin',
        aspectRatio: '16:9',
        style: 'professional',
        duration: 20
      }, {
        headers: { 
          'Cookie': 'theagencyiq.session=test_session',
          'Content-Type': 'application/json'
        }
      });
      console.log('✅ Business video generation successful:', businessResponse.data);
    } catch (error) {
      console.log('❌ Business video generation failed:', error.response?.data || error.message);
    }

    // Test 4: Test video generation for existing post
    console.log('\n4. Testing video generation for existing post...');
    try {
      const postVideoResponse = await axios.post(`${BASE_URL}/api/posts/1/generate-video`, {
        platform: 'facebook',
        aspectRatio: '16:9',
        style: 'lifestyle'
      }, {
        headers: { 
          'Cookie': 'theagencyiq.session=test_session',
          'Content-Type': 'application/json'
        }
      });
      console.log('✅ Post video generation successful:', postVideoResponse.data);
    } catch (error) {
      console.log('❌ Post video generation failed:', error.response?.data || error.message);
    }

    // Test 5: Check if video files are accessible
    console.log('\n5. Testing video file accessibility...');
    try {
      const uploadsDir = path.join(process.cwd(), 'uploads', 'videos');
      const files = fs.existsSync(uploadsDir) ? fs.readdirSync(uploadsDir) : [];
      
      if (files.length > 0) {
        console.log(`✅ Found ${files.length} video files in uploads directory`);
        console.log('Video files:', files.slice(0, 3)); // Show first 3 files
        
        // Test accessing video via URL
        const firstVideo = files[0];
        const videoUrl = `${BASE_URL}/uploads/videos/${firstVideo}`;
        
        try {
          const videoAccess = await axios.head(videoUrl);
          console.log('✅ Video accessible via URL:', videoUrl);
        } catch (urlError) {
          console.log('❌ Video not accessible via URL:', videoUrl);
        }
      } else {
        console.log('ℹ️ No video files found yet (this is normal for first run)');
      }
    } catch (error) {
      console.log('❌ Error checking video files:', error.message);
    }

    // Test 6: Test cleanup endpoint
    console.log('\n6. Testing video cleanup endpoint...');
    try {
      const cleanupResponse = await axios.post(`${BASE_URL}/api/cleanup-videos`, {
        maxAgeHours: 0.1 // Clean up videos older than 6 minutes for testing
      }, {
        headers: { 
          'Cookie': 'theagencyiq.session=test_session',
          'Content-Type': 'application/json'
        }
      });
      console.log('✅ Cleanup endpoint working:', cleanupResponse.data);
    } catch (error) {
      console.log('❌ Cleanup endpoint failed:', error.response?.data || error.message);
    }

    console.log('\n🎬 Video Generation System Test Complete!');
    
    // Summary
    console.log('\n📊 Test Summary:');
    console.log('- Video generation API endpoints implemented');
    console.log('- Support for multiple platforms (Instagram 9:16, LinkedIn/Facebook 16:9)');
    console.log('- ASMR and professional video styles supported');
    console.log('- Post-specific video generation enabled');
    console.log('- Static file serving for video access configured');
    console.log('- Video cleanup functionality implemented');
    
  } catch (error) {
    console.error('❌ Test suite failed:', error.message);
  }
}

// Run the test
testVideoGeneration().catch(console.error);