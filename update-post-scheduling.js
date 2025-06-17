/**
 * Update Post Scheduling for Immediate Publishing
 * Sets approved posts to be ready for immediate publishing
 */

import { storage } from './server/storage.js';

async function updatePostScheduling() {
  console.log('Updating approved posts for immediate publishing...');
  
  try {
    // Get all posts for user 2
    const allPosts = await storage.getPostsByUser(2);
    console.log(`Found ${allPosts.length} total posts`);
    
    // Find approved posts
    const approvedPosts = allPosts.filter(post => post.status === 'approved');
    console.log(`Found ${approvedPosts.length} approved posts`);
    
    if (approvedPosts.length === 0) {
      console.log('No approved posts found to update');
      return;
    }
    
    // Update approved posts to be scheduled for immediate publishing
    const now = new Date();
    const updatePromises = approvedPosts.map(async (post) => {
      try {
        await storage.updatePost(post.id, {
          scheduledFor: now,
          status: 'approved'
        });
        console.log(`✓ Updated post ${post.id} (${post.platform}) to be ready for publishing`);
        return true;
      } catch (error) {
        console.error(`✗ Failed to update post ${post.id}:`, error.message);
        return false;
      }
    });
    
    const results = await Promise.all(updatePromises);
    const successCount = results.filter(Boolean).length;
    
    console.log(`\n📋 Update Summary:`);
    console.log(`- Posts updated: ${successCount}/${approvedPosts.length}`);
    console.log(`- Ready for auto-posting enforcer: ${successCount} posts`);
    
    if (successCount > 0) {
      console.log(`\n🚀 Posts are now ready for publishing within your 30-day subscription period!`);
      console.log(`Run the auto-posting enforcer to publish them successfully.`);
    }
    
  } catch (error) {
    console.error('Error updating post scheduling:', error);
  }
}

updatePostScheduling();