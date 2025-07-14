/**
 * Test Auto-Posting Fix - Debug why 0 posts are publishing
 */

import axios from 'axios';

const BASE_URL = 'https://4fc77172-459a-4da7-8c33-5014abb1b73e-00-dqhtnud4ismj.worf.replit.dev';

async function testAutoPostingFix() {
  try {
    console.log('=== AUTO-POSTING FIX TEST ===');
    
    // Test 1: Check approved posts
    console.log('\n1. Checking approved posts...');
    const postsResponse = await axios.get(`${BASE_URL}/api/posts`, {
      withCredentials: true,
      headers: {
        'Cookie': 'theagencyiq.session=s%3Aaiq_md2c60ac_f4nmswxeny5.6lbC8cAPZiRdDoGnYwAqLQxHdmudhUohMGf59R0FJr8'
      }
    });
    
    const approvedPosts = postsResponse.data.filter(post => post.status === 'approved');
    console.log(`Found ${approvedPosts.length} approved posts`);
    
    // Test 2: Check platform connections
    console.log('\n2. Checking platform connections...');
    const connectionsResponse = await axios.get(`${BASE_URL}/api/platform-connections`, {
      withCredentials: true,
      headers: {
        'Cookie': 'theagencyiq.session=s%3Aaiq_md2c60ac_f4nmswxeny5.6lbC8cAPZiRdDoGnYwAqLQxHdmudhUohMGf59R0FJr8'
      }
    });
    
    console.log(`Platform connections: ${connectionsResponse.data.length}`);
    connectionsResponse.data.forEach(conn => {
      console.log(`- ${conn.platform}: ${conn.isActive ? 'Active' : 'Inactive'}`);
    });
    
    // Test 3: Run auto-posting enforcer
    console.log('\n3. Running auto-posting enforcer...');
    const enforceResponse = await axios.post(`${BASE_URL}/api/enforce-auto-posting`, {}, {
      withCredentials: true,
      headers: {
        'Cookie': 'theagencyiq.session=s%3Aaiq_md2c60ac_f4nmswxeny5.6lbC8cAPZiRdDoGnYwAqLQxHdmudhUohMGf59R0FJr8',
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Auto-posting result:', JSON.stringify(enforceResponse.data, null, 2));
    
    // Test 4: Check quota status
    console.log('\n4. Checking quota status...');
    const quotaResponse = await axios.get(`${BASE_URL}/api/subscription-usage`, {
      withCredentials: true,
      headers: {
        'Cookie': 'theagencyiq.session=s%3Aaiq_md2c60ac_f4nmswxeny5.6lbC8cAPZiRdDoGnYwAqLQxHdmudhUohMGf59R0FJr8'
      }
    });
    
    console.log('Quota status:', JSON.stringify(quotaResponse.data, null, 2));
    
    console.log('\n=== TEST COMPLETE ===');
    
  } catch (error) {
    console.error('Test failed:', error.response?.data || error.message);
  }
}

testAutoPostingFix();