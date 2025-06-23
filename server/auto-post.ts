import { storage } from './storage';

const publishPost = async (post: any) => {
  const tokenKey = post.platform.toUpperCase() + '_ACCESS_TOKEN';
  const token = process.env[tokenKey] || process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
  console.log(`[DEBUG] ${post.platform} token for ${post.id}: ${token?.substring(0, 5)}...`);
  
  const url = post.platform === 'x' ? 'https://api.x.com/2/tweets' : 
              post.platform === 'linkedin' ? 'https://api.linkedin.com/v2/ugcPosts' : 
              'https://graph.facebook.com/' + (post.platform === 'facebook' ? post.pageId + '/feed' : 'post');
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: post.content, ...(post.platform === 'facebook' ? { message: post.content } : {}) })
    });
    console.log(`[DEBUG] ${post.id} response: ${response.status} ${response.statusText}`);
    return response.ok;
  } catch (error: any) {
    console.log(`[DEBUG] ${post.id} error: ${error.message}`);
    return false;
  }
};

const enforcePublishing = async () => {
  const userId = 61424835189;
  const allPosts = await storage.getPostsByUser(userId);
  const pendingPosts = allPosts.filter((p: any) => p.status === 'pending');
  console.log('[DEBUG] Pending posts:', pendingPosts.length);
  
  for (const post of pendingPosts) {
    const success = await publishPost(post);
    await storage.updatePost(post.id, { 
      status: success ? 'success' : 'failed',
      publishedAt: success ? new Date() : null
    });
    console.log(`[DEBUG] Updated ${post.id} to ${success ? 'success' : 'failed'}`);
  }
};

// Run every 30 seconds
setInterval(enforcePublishing, 30000);

export { enforcePublishing, publishPost };