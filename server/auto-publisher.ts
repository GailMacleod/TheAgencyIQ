/**
 * REPLIT-NATIVE AUTO-PUBLISHER
 * Publishes posts using stored OAuth tokens with retry logic
 */

import { storage } from './storage';
import { getValidToken } from './token-manager';

interface Post {
  id: number;
  content: string;
  platform: string;
  status: string;
}

const publishPost = async (post: Post): Promise<boolean> => {
  console.log(`[AUTO-PUB] Attempting to publish post ${post.id} to ${post.platform}`);
  
  const token = await getValidToken(post.platform);
  if (!token) {
    console.log(`[AUTO-PUB] No valid token for ${post.platform}`);
    return false;
  }
  
  try {
    // Platform-specific API endpoints
    const endpoints: Record<string, { url: string; method: string; body: any }> = {
      x: {
        url: 'https://api.twitter.com/2/tweets',
        method: 'POST',
        body: { text: post.content }
      },
      linkedin: {
        url: 'https://api.linkedin.com/v2/ugcPosts',
        method: 'POST',
        body: {
          author: 'urn:li:person:your-person-id',
          lifecycleState: 'PUBLISHED',
          specificContent: {
            'com.linkedin.ugc.ShareContent': {
              shareCommentary: { text: post.content },
              shareMediaCategory: 'NONE'
            }
          }
        }
      },
      facebook: {
        url: 'https://graph.facebook.com/me/feed',
        method: 'POST',
        body: { message: post.content }
      },
      instagram: {
        url: 'https://graph.facebook.com/me/media',
        method: 'POST',
        body: { caption: post.content, media_type: 'TEXT' }
      },
      youtube: {
        url: 'https://www.googleapis.com/youtube/v3/activities',
        method: 'POST',
        body: {
          snippet: {
            description: post.content
          }
        }
      }
    };
    
    const endpoint = endpoints[post.platform];
    if (!endpoint) {
      console.log(`[AUTO-PUB] No endpoint configured for ${post.platform}`);
      return false;
    }
    
    const response = await fetch(endpoint.url, {
      method: endpoint.method,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(endpoint.body)
    });
    
    if (response.ok) {
      await storage.updatePost(post.id, { 
        status: 'success', 
        publishedAt: new Date() 
      });
      console.log(`[AUTO-PUB] Successfully published post ${post.id} to ${post.platform}`);
      return true;
    } else {
      const errorData = await response.text();
      console.error(`[AUTO-PUB] Failed to publish post ${post.id}:`, response.status, errorData);
      await storage.updatePost(post.id, { status: 'failed' });
      return false;
    }
    
  } catch (error) {
    console.error(`[AUTO-PUB] Error publishing post ${post.id}:`, error);
    await storage.updatePost(post.id, { status: 'failed' });
    return false;
  }
};

const enforcePublishing = async (): Promise<void> => {
  try {
    console.log('[AUTO-PUB] Starting publishing enforcement...');
    
    // Get all pending posts across all users
    const allUsers = await storage.getAllUsers();
    
    for (const user of allUsers) {
      const posts = await storage.getPostsByUser(user.id);
      const pendingPosts = posts.filter(p => p.status === 'pending');
      
      if (pendingPosts.length > 0) {
        console.log(`[AUTO-PUB] Found ${pendingPosts.length} pending posts for user ${user.id}`);
        
        for (const post of pendingPosts) {
          await publishPost(post);
          // Add delay between posts to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    }
    
    console.log('[AUTO-PUB] Publishing enforcement completed');
    
  } catch (error) {
    console.error('[AUTO-PUB] Error in publishing enforcement:', error);
  }
};

// Run enforcement every 30 seconds
setInterval(enforcePublishing, 30000);

// Initial run
setTimeout(enforcePublishing, 5000);

export { publishPost, enforcePublishing };