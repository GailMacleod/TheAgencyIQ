/**
 * Direct Database Update for Post Scheduling
 * Updates approved posts to be ready for auto-posting enforcer
 */

import { createServer } from 'http';
import express from 'express';

// Create a temporary endpoint to update post scheduling
const app = express();
app.use(express.json());

app.post('/update-scheduling', async (req, res) => {
  try {
    const { storage } = await import('./server/storage.js');
    
    // Get all posts for user 2
    const allPosts = await storage.getPostsByUser(2);
    const approvedPosts = allPosts.filter(post => post.status === 'approved');
    
    console.log(`Found ${approvedPosts.length} approved posts to update`);
    
    if (approvedPosts.length === 0) {
      return res.json({ success: false, message: 'No approved posts found' });
    }
    
    // Update each approved post directly
    const now = new Date();
    const results = [];
    
    for (const post of approvedPosts) {
      try {
        await storage.updatePost(post.id, {
          scheduledFor: now
        });
        results.push(`✓ Post ${post.id} (${post.platform}) scheduled for immediate publishing`);
        console.log(`Updated post ${post.id} scheduling`);
      } catch (error) {
        results.push(`✗ Failed to update post ${post.id}: ${error.message}`);
        console.error(`Failed to update post ${post.id}:`, error);
      }
    }
    
    res.json({
      success: true,
      message: 'Post scheduling updated',
      results: results,
      postsUpdated: results.filter(r => r.includes('✓')).length,
      totalPosts: approvedPosts.length
    });
    
  } catch (error) {
    console.error('Error updating post scheduling:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update post scheduling',
      error: error.message
    });
  }
});

const server = createServer(app);
server.listen(3001, () => {
  console.log('Scheduling update server running on port 3001');
  
  // Make the update request
  import('axios').then(({ default: axios }) => {
    axios.post('http://localhost:3001/update-scheduling')
      .then(response => {
        console.log('\n📋 Scheduling Update Results:');
        console.log(`Posts updated: ${response.data.postsUpdated}/${response.data.totalPosts}`);
        response.data.results.forEach(result => console.log(result));
        
        if (response.data.postsUpdated > 0) {
          console.log('\n🚀 Posts are now ready for auto-posting enforcer!');
        }
        
        server.close();
        process.exit(0);
      })
      .catch(error => {
        console.error('Update failed:', error.response?.data || error.message);
        server.close();
        process.exit(1);
      });
  });
});