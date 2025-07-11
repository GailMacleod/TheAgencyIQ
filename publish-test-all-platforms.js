/**
 * Publish Test to All Platforms
 * Uses existing posts and proper OAuth system
 */

async function publishTestToAllPlatforms() {
  const baseUrl = 'https://4fc77172-459a-4da7-8c33-5014abb1b73e-00-dqhtnud4ismj.worf.replit.dev';
  
  console.log('🚀 PUBLISHING TEST TO ALL PLATFORMS');
  console.log('===================================');
  
  try {
    // Get existing posts to find one to publish
    console.log('📋 Getting existing posts...');
    const postsResponse = await fetch(`${baseUrl}/api/posts`, {
      credentials: 'include',
      headers: {
        'Cookie': 'connect.sid=aiq_mcyk6glu_e2yqw9cgwi7'
      }
    });
    
    if (!postsResponse.ok) {
      console.error('Failed to get posts:', await postsResponse.text());
      return;
    }
    
    const posts = await postsResponse.json();
    console.log(`Found ${posts.length} posts`);
    
    // Find a draft post to publish
    const draftPost = posts.find(p => p.status === 'draft');
    if (!draftPost) {
      console.log('No draft posts found, creating a new one...');
      
      // Create a new post with proper date format
      const createResponse = await fetch(`${baseUrl}/api/posts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': 'connect.sid=aiq_mcyk6glu_e2yqw9cgwi7'
        },
        body: JSON.stringify({
          content: 'Test - Publishing to all platforms',
          platform: 'facebook',
          scheduledFor: new Date(),
          status: 'draft'
        })
      });
      
      if (!createResponse.ok) {
        console.error('Failed to create post:', await createResponse.text());
        return;
      }
      
      const newPost = await createResponse.json();
      console.log('Created new post:', newPost.id);
      
      // Now publish this post
      await publishPost(newPost.id, baseUrl);
    } else {
      console.log(`Using existing draft post: ${draftPost.id}`);
      await publishPost(draftPost.id, baseUrl);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

async function publishPost(postId, baseUrl) {
  console.log(`🚀 Publishing post ${postId} to all platforms...`);
  
  try {
    // Use the PostPublisher API with all platforms
    const publishResponse = await fetch(`${baseUrl}/api/publish-post`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': 'connect.sid=aiq_mcyk6glu_e2yqw9cgwi7'
      },
      body: JSON.stringify({
        postId: postId,
        platforms: ['facebook', 'instagram', 'linkedin', 'x', 'youtube']
      })
    });
    
    console.log('Publish response status:', publishResponse.status);
    
    if (!publishResponse.ok) {
      const errorText = await publishResponse.text();
      console.error('Publish failed:', errorText);
      return;
    }
    
    const result = await publishResponse.json();
    console.log('\n📊 Publishing Results:');
    console.log(JSON.stringify(result, null, 2));
    
    if (result.results) {
      console.log('\n📋 Platform Results Summary:');
      Object.entries(result.results).forEach(([platform, platformResult]) => {
        const status = platformResult.success ? '✅ SUCCESS' : '❌ FAILED';
        console.log(`  ${platform.toUpperCase()}: ${status}`);
        if (platformResult.error) {
          console.log(`    Error: ${platformResult.error}`);
        }
        if (platformResult.platformPostId) {
          console.log(`    Post ID: ${platformResult.platformPostId}`);
        }
      });
    }
    
    console.log(`\n📈 Overall Success: ${result.success ? 'Yes' : 'No'}`);
    if (result.remainingPosts !== undefined) {
      console.log(`🔢 Remaining Posts: ${result.remainingPosts}`);
    }
    
  } catch (error) {
    console.error('❌ Publishing failed:', error.message);
  }
}

publishTestToAllPlatforms();