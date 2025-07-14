/**
 * Test Real Facebook Publishing - NO SIMULATION
 */

import axios from 'axios';

const BASE_URL = 'https://4fc77172-459a-4da7-8c33-5014abb1b73e-00-dqhtnud4ismj.worf.replit.dev';

async function testRealFacebookPublish() {
  try {
    console.log('=== REAL FACEBOOK PUBLISHING TEST ===');
    
    // Clear any existing posts first
    console.log('\n1. Clearing existing posts...');
    await axios.delete(`${BASE_URL}/api/posts/clear-all`, {
      withCredentials: true,
      headers: {
        'Cookie': 'theagencyiq.session=s%3Aaiq_md2c60ac_f4nmswxeny5.6lbC8cAPZiRdDoGnYwAqLQxHdmudhUohMGf59R0FJr8'
      }
    });
    
    // Create a new test post
    console.log('\n2. Creating a new test post...');
    const createResponse = await axios.post(`${BASE_URL}/api/posts`, {
      platform: 'facebook',
      content: 'REAL Facebook test post from TheAgencyIQ - ' + new Date().toISOString(),
      status: 'approved',
      scheduledFor: new Date().toISOString()
    }, {
      withCredentials: true,
      headers: {
        'Cookie': 'theagencyiq.session=s%3Aaiq_md2c60ac_f4nmswxeny5.6lbC8cAPZiRdDoGnYwAqLQxHdmudhUohMGf59R0FJr8',
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Test post created:', createResponse.data);
    
    // Run auto-posting enforcer for REAL publishing
    console.log('\n3. Running REAL auto-posting enforcer...');
    const enforceResponse = await axios.post(`${BASE_URL}/api/enforce-auto-posting`, {}, {
      withCredentials: true,
      headers: {
        'Cookie': 'theagencyiq.session=s%3Aaiq_md2c60ac_f4nmswxeny5.6lbC8cAPZiRdDoGnYwAqLQxHdmudhUohMGf59R0FJr8',
        'Content-Type': 'application/json'
      }
    });
    
    console.log('REAL Facebook publishing result:', JSON.stringify(enforceResponse.data, null, 2));
    
    // Check if the post was actually published
    console.log('\n4. Checking published posts...');
    const postsResponse = await axios.get(`${BASE_URL}/api/posts`, {
      withCredentials: true,
      headers: {
        'Cookie': 'theagencyiq.session=s%3Aaiq_md2c60ac_f4nmswxeny5.6lbC8cAPZiRdDoGnYwAqLQxHdmudhUohMGf59R0FJr8'
      }
    });
    
    const publishedPosts = postsResponse.data.filter(post => post.status === 'published');
    console.log(`Found ${publishedPosts.length} published posts`);
    
    publishedPosts.forEach(post => {
      console.log(`- Post ${post.id}: ${post.platform} - Status: ${post.status}`);
      if (post.publishedAt) {
        console.log(`  Published at: ${post.publishedAt}`);
      }
    });
    
    console.log('\n=== REAL FACEBOOK PUBLISHING TEST COMPLETE ===');
    
  } catch (error) {
    console.error('REAL Facebook publishing test failed:', error.response?.data || error.message);
  }
}

testRealFacebookPublish();