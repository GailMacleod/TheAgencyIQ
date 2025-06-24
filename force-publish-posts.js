/**
 * Force Publish Approved Posts - Immediate Publishing
 * Bypasses connection validation for immediate post publication
 */

import axios from 'axios';

async function forcePublishPosts() {
  console.log('Force publishing approved posts...');
  
  try {
    // Get all approved posts
    const postsResponse = await axios.get('http://localhost:5000/api/posts', {
      withCredentials: true
    });
    
    const posts = postsResponse.data;
    const approvedPosts = posts.filter(p => p.status === 'approved');
    
    console.log(`Found ${approvedPosts.length} approved posts to publish`);
    
    if (approvedPosts.length === 0) {
      console.log('No approved posts found');
      return;
    }
    
    // Force publish each approved post
    let successCount = 0;
    for (const post of approvedPosts) {
      try {
        console.log(`Publishing post ${post.id} to ${post.platform}...`);
        
        const response = await axios.post(`http://localhost:5000/api/approve-post`, {
          postId: post.id
        }, {
          withCredentials: true,
          headers: { 'Content-Type': 'application/json' }
        });
        
        if (response.data.success) {
          console.log(`✓ Post ${post.id} published successfully to ${post.platform}`);
          successCount++;
        } else {
          console.log(`✗ Post ${post.id} failed: ${response.data.message}`);
        }
        
        // Add delay between posts
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.log(`✗ Post ${post.id} error: ${error.response?.data?.message || error.message}`);
      }
    }
    
    console.log(`\n📊 Publishing Results:`);
    console.log(`- Posts published: ${successCount}/${approvedPosts.length}`);
    console.log(`- Success rate: ${Math.round((successCount/approvedPosts.length)*100)}%`);
    
    if (successCount > 0) {
      console.log(`\n🚀 SUCCESS: ${successCount} posts published!`);
    } else {
      console.log(`\n⚠️ All posts require platform reconnection to publish`);
    }
    
  } catch (error) {
    console.error('Error force publishing posts:', error.response?.data?.message || error.message);
  }
}

forcePublishPosts();