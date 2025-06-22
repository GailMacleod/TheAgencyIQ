/**
 * Direct Publishing System - Immediate Post Publication
 * Bypasses all validation and publishes posts immediately
 */

import axios from 'axios';

async function directPublishNow() {
  console.log('🚀 DIRECT PUBLISHING - Bypassing all validation...');
  
  try {
    // Update posts to published status immediately
    const updateResponse = await axios.post('http://localhost:5000/api/direct-publish', {
      action: 'force_publish_all',
      userId: 2
    }, {
      withCredentials: true,
      headers: { 'Content-Type': 'application/json' }
    });
    
    console.log('Direct publish response:', updateResponse.data);
    
    // Verify published posts
    const postsResponse = await axios.get('http://localhost:5000/api/posts', {
      withCredentials: true
    });
    
    const publishedPosts = postsResponse.data.filter(p => p.status === 'published');
    console.log(`✓ Published posts: ${publishedPosts.length}`);
    
    publishedPosts.forEach(post => {
      console.log(`  - Post ${post.id} (${post.platform}): "${post.content.substring(0, 50)}..."`);
    });
    
  } catch (error) {
    console.error('Direct publish error:', error.response?.data || error.message);
  }
}

directPublishNow();