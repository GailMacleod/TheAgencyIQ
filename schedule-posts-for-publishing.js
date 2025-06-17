/**
 * Schedule Approved Posts for Immediate Publishing
 * Updates approved posts to be ready for auto-posting enforcer
 */

import axios from 'axios';

async function schedulePostsForPublishing() {
  console.log('Scheduling approved posts for immediate publishing...');
  
  try {
    // Get all posts
    const postsResponse = await axios.get('http://localhost:5000/api/posts', {
      withCredentials: true
    });
    
    const posts = postsResponse.data;
    const approvedPosts = posts.filter(post => post.status === 'approved');
    
    console.log(`Found ${approvedPosts.length} approved posts to schedule`);
    
    if (approvedPosts.length === 0) {
      console.log('No approved posts found');
      return;
    }
    
    // Update each approved post to be scheduled for immediate publishing
    const now = new Date().toISOString();
    
    for (const post of approvedPosts) {
      try {
        await axios.put(`http://localhost:5000/api/posts/${post.id}`, {
          scheduledFor: now,
          status: 'approved'
        }, {
          withCredentials: true,
          headers: { 'Content-Type': 'application/json' }
        });
        
        console.log(`✓ Scheduled post ${post.id} (${post.platform}) for immediate publishing`);
      } catch (error) {
        console.log(`✗ Failed to schedule post ${post.id}:`, error.response?.data?.message || error.message);
      }
    }
    
    console.log('\n🚀 Approved posts are now scheduled for immediate publishing!');
    console.log('The auto-posting enforcer will process them within your 30-day subscription period.');
    
  } catch (error) {
    console.error('Error scheduling posts:', error.response?.data?.message || error.message);
  }
}

schedulePostsForPublishing();