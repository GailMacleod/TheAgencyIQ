/**
 * Simple test to verify REAL Facebook publishing (no simulation)
 */

import axios from 'axios';

const BASE_URL = 'https://4fc77172-459a-4da7-8c33-5014abb1b73e-00-dqhtnud4ismj.worf.replit.dev';

async function testRealPublish() {
  try {
    console.log('=== Testing REAL Facebook Publishing ===');
    
    // Run auto-posting enforcer
    console.log('Running auto-posting enforcer...');
    const enforceResponse = await axios.post(`${BASE_URL}/api/enforce-auto-posting`, {}, {
      withCredentials: true,
      headers: {
        'Cookie': 'theagencyiq.session=s%3Aaiq_md2c60ac_f4nmswxeny5.6lbC8cAPZiRdDoGnYwAqLQxHdmudhUohMGf59R0FJr8',
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Publishing result:', JSON.stringify(enforceResponse.data, null, 2));
    
    // Check current posts
    const postsResponse = await axios.get(`${BASE_URL}/api/posts`, {
      withCredentials: true,
      headers: {
        'Cookie': 'theagencyiq.session=s%3Aaiq_md2c60ac_f4nmswxeny5.6lbC8cAPZiRdDoGnYwAqLQxHdmudhUohMGf59R0FJr8'
      }
    });
    
    console.log('\nCurrent posts:');
    postsResponse.data.forEach(post => {
      console.log(`- Post ${post.id}: ${post.platform} - Status: ${post.status}`);
    });
    
    const publishedCount = postsResponse.data.filter(p => p.status === 'published').length;
    console.log(`\nTotal published posts: ${publishedCount}`);
    
    if (publishedCount > 0) {
      console.log('✅ SUCCESS: Real Facebook publishing is working!');
    } else {
      console.log('❌ ISSUE: No posts were published');
    }
    
  } catch (error) {
    console.error('Test failed:', error.response?.data || error.message);
  }
}

testRealPublish();