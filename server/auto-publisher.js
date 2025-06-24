const { db } = require('./db');
const { posts, oauthTokens } = require('../shared/schema');
const { eq } = require('drizzle-orm');

// Simple in-memory queue
let postQueue = [];
let processing = false;

const processQueue = async () => {
  if (processing || postQueue.length === 0) return;
  processing = true;
  
  while (postQueue.length > 0) {
    const post = postQueue.shift();
    try {
      await publishPost(post);
    } catch (error) {
      console.error('[PUBLISHER] Failed:', error);
    }
  }
  processing = false;
};

const publishPost = async (post) => {
  console.log(`[PUBLISHER] Publishing post ${post.id} to ${post.platform}`);
  
  try {
    const token = await db.select({ 
      accessToken: oauthTokens.accessToken 
    }).from(oauthTokens).where(eq(oauthTokens.platform, post.platform)).get();
    
    if (!token?.accessToken) {
      throw new Error('No token');
    }
    
    // Platform-specific endpoints
    const endpoints = {
      x: 'https://api.twitter.com/2/tweets',
      facebook: 'https://graph.facebook.com/v18.0/me/feed',
      linkedin: 'https://api.linkedin.com/v2/ugcPosts',
      youtube: 'https://www.googleapis.com/youtube/v3/activities'
    };
    
    const response = await fetch(endpoints[post.platform], {
      method: 'POST',
      headers: { 
        Authorization: `Bearer ${token.accessToken}`, 
        'Content-Type': 'application/json' 
      },
      body: JSON.stringify({ text: post.content })
    });
    
    if (response.ok) {
      await db.update(posts).set({ 
        status: 'success', 
        publishedAt: new Date() 
      }).where(eq(posts.id, post.id));
      console.log(`[PUBLISHER] Success: ${post.id}`);
    } else {
      await db.update(posts).set({ 
        status: 'failed' 
      }).where(eq(posts.id, post.id));
      console.log(`[PUBLISHER] Failed: ${post.id}`);
    }
  } catch (error) {
    await db.update(posts).set({ 
      status: 'failed' 
    }).where(eq(posts.id, post.id));
    console.error(`[PUBLISHER] Error ${post.id}:`, error.message);
  }
};

const enforcePublishing = async () => {
  try {
    const pendingPosts = await db.select().from(posts).where(eq(posts.status, 'pending'));
    console.log(`[PUBLISHER] Found ${pendingPosts.length} pending posts for publishing`);
    
    if (pendingPosts.length > 0) {
      for (const post of pendingPosts) {
        postQueue.push(post);
      }
      processQueue();
    }
  } catch (error) {
    console.error('[PUBLISHER] Enforcement error:', error);
  }
};

// Start enforcement every 30 seconds
setInterval(enforcePublishing, 30000);
console.log('[PUBLISHER] Auto-publisher initialized');

module.exports = { enforcePublishing, postQueue };