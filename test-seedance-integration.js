/**
 * SEEDANCE 1.0 INTEGRATION TEST
 * Tests advanced video & content generation endpoints
 */

async function testSeedanceIntegration() {
  console.log('🎬 SEEDANCE 1.0 INTEGRATION TEST');
  console.log('================================');
  
  try {
    // Test 1: Content Generation
    console.log('\n1. Testing Seedance content generation...');
    const generateResponse = await fetch('http://localhost:5000/api/posts/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': 'connect.sid=test_session'
      },
      body: JSON.stringify({})
    });
    
    if (generateResponse.ok) {
      const generateData = await generateResponse.json();
      console.log(`✅ Generated ${generateData.posts?.length || 0} posts with Seedance 1.0`);
      console.log(`📊 Quota: ${generateData.quota}, Subscription: ${generateData.subscription}`);
      
      // Test 2: Video Generation for first post
      if (generateData.posts && generateData.posts.length > 0) {
        const firstPost = generateData.posts[0];
        console.log('\n2. Testing video generation...');
        
        const videoResponse = await fetch('http://localhost:5000/api/posts/video-generate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Cookie': 'connect.sid=test_session'
          },
          body: JSON.stringify({
            postId: firstPost.id,
            videoStyle: 'professional',
            duration: 15
          })
        });
        
        if (videoResponse.ok) {
          const videoData = await videoResponse.json();
          console.log(`✅ Video generated for post: ${firstPost.id}`);
          console.log(`🎥 Video URL: ${videoData.video?.url || 'N/A'}`);
          console.log(`📐 Resolution: ${videoData.video?.resolution || 'N/A'}`);
        } else {
          console.log(`❌ Video generation failed: ${videoResponse.status}`);
        }
      }
      
      // Test 3: Seedance Status
      console.log('\n3. Testing Seedance status...');
      const statusResponse = await fetch('http://localhost:5000/api/posts/seedance-status', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': 'connect.sid=test_session'
        }
      });
      
      if (statusResponse.ok) {
        const statusData = await statusResponse.json();
        console.log(`✅ Seedance status retrieved`);
        console.log(`📈 Statistics:`, statusData.statistics);
        console.log(`🎯 Seedance Version: ${statusData.seedanceVersion}`);
      } else {
        console.log(`❌ Status check failed: ${statusResponse.status}`);
      }
      
    } else {
      console.log(`❌ Content generation failed: ${generateResponse.status}`);
      const errorText = await generateResponse.text();
      console.log('Error response preview:', errorText.substring(0, 200));
    }
    
    console.log('\n🏆 SEEDANCE 1.0 INTEGRATION TEST COMPLETE');
    console.log('==========================================');
    
  } catch (error) {
    console.error('❌ Seedance integration test failed:', error);
  }
}

// Run the test
testSeedanceIntegration();