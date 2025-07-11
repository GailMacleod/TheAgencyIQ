#!/usr/bin/env node

/**
 * Authenticated Platform Publishing Test
 * Tests publishing "TEST" to all platforms with proper session authentication
 */

const baseUrl = 'https://4fc77172-459a-4da7-8c33-5014abb1b73e-00-dqhtnud4ismj.worf.replit.dev';

async function establishSession() {
  console.log('🔐 Establishing authentication session...');
  
  try {
    const sessionResponse = await fetch(`${baseUrl}/api/establish-session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({})
    });

    if (sessionResponse.ok) {
      const sessionData = await sessionResponse.json();
      console.log('✅ Session established:', sessionData.userEmail);
      
      // Extract session cookie
      const cookies = sessionResponse.headers.get('set-cookie');
      return cookies;
    } else {
      console.log('❌ Session establishment failed:', sessionResponse.status);
      return null;
    }
  } catch (error) {
    console.error('❌ Session establishment error:', error.message);
    return null;
  }
}

async function testAuthenticatedPublishing() {
  console.log('🚀 AUTHENTICATED PLATFORM PUBLISHING TEST');
  console.log('==========================================');
  
  // First establish session
  const sessionCookies = await establishSession();
  
  if (!sessionCookies) {
    console.log('❌ Cannot proceed without authentication');
    return;
  }

  console.log('\n📝 Testing publication of "TEST" to all platforms...\n');

  // Test direct publishing with authentication
  console.log('📝 Direct Publishing API (Authenticated)');
  console.log('------------------------------------------');
  
  try {
    const directResponse = await fetch(`${baseUrl}/api/direct-publish`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': sessionCookies
      },
      body: JSON.stringify({
        content: 'TEST',
        platforms: ['facebook', 'instagram', 'linkedin', 'x', 'youtube']
      })
    });

    console.log(`Response Status: ${directResponse.status}`);
    
    if (directResponse.ok) {
      const result = await directResponse.json();
      console.log('✅ Direct Publishing Results:');
      console.log(JSON.stringify(result, null, 2));
      
      if (result.results) {
        console.log('\n📋 Platform Results Summary:');
        result.results.forEach(platformResult => {
          const status = platformResult.success ? '✅ SUCCESS' : '❌ FAILED';
          console.log(`  ${platformResult.platform.toUpperCase()}: ${status}`);
          if (platformResult.error) {
            console.log(`    Error: ${platformResult.error}`);
          }
          if (platformResult.postId) {
            console.log(`    Post ID: ${platformResult.postId}`);
          }
        });
      }
    } else {
      const errorText = await directResponse.text();
      console.log('❌ Direct Publishing Failed:', errorText);
    }
  } catch (error) {
    console.error('❌ Direct Publishing Error:', error.message);
  }

  console.log('\n' + '='.repeat(50));
  
  // Test individual platform publishing
  console.log('📝 Individual Platform Tests (Authenticated)');
  console.log('---------------------------------------------');
  
  const platforms = ['facebook', 'instagram', 'linkedin', 'x', 'youtube'];
  
  for (const platform of platforms) {
    console.log(`\n🔗 Testing ${platform.toUpperCase()} publishing...`);
    
    try {
      const individualResponse = await fetch(`${baseUrl}/api/direct-publish`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': sessionCookies
        },
        body: JSON.stringify({
          content: 'TEST',
          platforms: [platform]
        })
      });

      console.log(`   Response Status: ${individualResponse.status}`);
      
      if (individualResponse.ok) {
        const individualResult = await individualResponse.json();
        console.log('   Raw Response:', JSON.stringify(individualResult, null, 2));
        
        if (individualResult.results && individualResult.results.length > 0) {
          const platformResult = individualResult.results[0];
          const status = platformResult.success ? '✅ SUCCESS' : '❌ FAILED';
          console.log(`   Publishing: ${status}`);
          if (platformResult.error) {
            console.log(`   Error: ${platformResult.error}`);
          }
          if (platformResult.postId) {
            console.log(`   Post ID: ${platformResult.postId}`);
          }
        } else {
          console.log('   Publishing: ❌ NO RESULTS');
        }
      } else {
        const errorText = await individualResponse.text();
        console.log(`   Publishing: ❌ FAILED - ${errorText}`);
      }
    } catch (error) {
      console.log(`   Error: ${error.message}`);
    }
  }

  console.log('\n' + '='.repeat(50));
  
  // Test standard post creation and publishing
  console.log('📝 Standard Post Creation & Publishing (Authenticated)');
  console.log('-------------------------------------------------------');
  
  try {
    // First create a post
    const createResponse = await fetch(`${baseUrl}/api/posts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': sessionCookies
      },
      body: JSON.stringify({
        content: 'TEST - Standard API',
        platform: 'facebook',
        status: 'draft'
      })
    });

    console.log(`Create Response Status: ${createResponse.status}`);
    
    if (createResponse.ok) {
      const newPost = await createResponse.json();
      console.log('✅ Post Created:', newPost.id);
      
      // Now publish to all platforms
      const publishResponse = await fetch(`${baseUrl}/api/publish-post`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': sessionCookies
        },
        body: JSON.stringify({
          postId: newPost.id,
          platforms: ['facebook', 'instagram', 'linkedin', 'x', 'youtube']
        })
      });

      console.log(`Publish Response Status: ${publishResponse.status}`);
      
      if (publishResponse.ok) {
        const publishResult = await publishResponse.json();
        console.log('✅ Standard Publishing Results:');
        console.log(JSON.stringify(publishResult, null, 2));
        
        if (publishResult.results) {
          console.log('\n📋 Platform Results Summary:');
          Object.entries(publishResult.results).forEach(([platform, platformResult]) => {
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
      } else {
        const errorText = await publishResponse.text();
        console.log('❌ Standard Publishing Failed:', errorText);
      }
    } else {
      const errorText = await createResponse.text();
      console.log('❌ Post Creation Failed:', errorText);
    }
  } catch (error) {
    console.error('❌ Standard Publishing Error:', error.message);
  }

  console.log('\n' + '='.repeat(50));
  console.log('🏁 AUTHENTICATED PUBLISHING TEST COMPLETE');
  console.log('='.repeat(50));
}

// Run the test
testAuthenticatedPublishing().catch(console.error);