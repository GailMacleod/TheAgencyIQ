/**
 * QUEENSLAND EVENT-DRIVEN CONTENT GENERATION TEST
 * Tests enhanced content generation with Queensland event context and platform compliance
 */

import axios from 'axios';

async function testQueenslandEventContent() {
  console.log('🎯 TESTING QUEENSLAND EVENT-DRIVEN CONTENT GENERATION\n');
  
  const testData = {
    brandName: 'TestAgency Queensland',
    productsServices: 'AI-powered social media automation',
    corePurpose: 'Streamline Queensland business operations',
    audience: 'Queensland small business owners',
    jobToBeDone: 'Automate social media marketing',
    motivations: 'Save time and increase engagement',
    painPoints: 'Manual posting, inconsistent content',
    goals: { 
      leadGeneration: true, 
      brandAwareness: true,
      eventMarketing: true 
    },
    logoUrl: '',
    contactDetails: { 
      email: 'test@queensland.com.au', 
      phone: '+61400000000' 
    },
    platforms: ['facebook', 'instagram', 'linkedin', 'youtube', 'x'],
    totalPosts: 10
  };

  try {
    console.log('📡 Sending request to content generation API...');
    
    // First establish session via public endpoint
    const sessionResponse = await axios.post('http://localhost:5000/api/establish-session', {
      email: 'test@queensland.com.au'
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    // Extract session cookie
    const cookies = sessionResponse.headers['set-cookie'];
    const sessionCookie = cookies ? cookies.find(cookie => cookie.includes('connect.sid')) : null;
    
    console.log('🔐 Session established, generating content...');
    
    const response = await axios.post('http://localhost:5000/api/generate-content-calendar', testData, {
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Queensland-Event-Test/1.0',
        'Cookie': sessionCookie || ''
      },
      timeout: 60000
    });

    const responseData = response.data;
    console.log('Response type:', typeof responseData);
    console.log('Response structure:', Object.keys(responseData || {}));
    
    // Handle different response formats
    let posts;
    if (Array.isArray(responseData)) {
      posts = responseData;
    } else if (responseData && Array.isArray(responseData.posts)) {
      posts = responseData.posts;
    } else if (responseData && responseData.message) {
      console.log('API Message:', responseData.message);
      posts = [];
    } else {
      console.log('Unexpected response format:', responseData);
      posts = [];
    }
    
    console.log(`✅ Generated ${posts.length} posts successfully\n`);

    // Analyze event-driven content
    let eventDrivenCount = 0;
    let platformCompliance = {
      facebook: { posts: 0, wordCountValid: 0 },
      instagram: { posts: 0, wordCountValid: 0 },
      linkedin: { posts: 0, wordCountValid: 0 },
      youtube: { posts: 0, wordCountValid: 0 },
      x: { posts: 0, wordCountValid: 0, hashtagViolations: 0 }
    };

    posts.forEach((post, index) => {
      console.log(`📝 POST ${index + 1} (${post.platform.toUpperCase()})`);
      console.log(`Content: ${post.content.substring(0, 80)}...`);
      console.log(`Scheduled: ${new Date(post.scheduledFor).toLocaleDateString('en-AU')}`);
      
      if (post.eventContext && post.eventContext.includes('Queensland Event:')) {
        eventDrivenCount++;
        console.log(`🎪 Event Context: ${post.eventContext.substring(0, 50)}...`);
      }
      
      // Platform compliance check
      const platform = post.platform.toLowerCase();
      if (platformCompliance[platform]) {
        platformCompliance[platform].posts++;
        
        // Word count validation
        const wordCount = post.content.split(/\s+/).length;
        console.log(`📊 Word Count: ${wordCount} words`);
        
        if (post.platformCompliance) {
          console.log(`✅ Platform Compliance: ${JSON.stringify(post.platformCompliance)}`);
          
          // Validate word count ranges
          const range = post.platformCompliance.wordCountRange;
          if (range) {
            const [min, max] = range.split('-').map(n => parseInt(n));
            if (wordCount >= min && wordCount <= max) {
              platformCompliance[platform].wordCountValid++;
            }
          }
          
          // X platform hashtag check
          if (platform === 'x') {
            if (post.content.includes('#')) {
              platformCompliance[platform].hashtagViolations++;
              console.log('❌ HASHTAG VIOLATION detected on X platform!');
            } else {
              console.log('✅ X platform hashtag compliance verified');
            }
          }
        }
      }
      
      console.log('---\n');
    });

    // Summary Report
    console.log('📊 QUEENSLAND EVENT-DRIVEN CONTENT ANALYSIS');
    console.log(`Total Posts Generated: ${posts.length}`);
    console.log(`Event-Driven Posts: ${eventDrivenCount} (${Math.round(eventDrivenCount/posts.length*100)}%)`);
    
    console.log('\n🎯 PLATFORM COMPLIANCE REPORT:');
    Object.keys(platformCompliance).forEach(platform => {
      const stats = platformCompliance[platform];
      const complianceRate = stats.posts > 0 ? Math.round(stats.wordCountValid/stats.posts*100) : 0;
      console.log(`${platform.toUpperCase()}: ${stats.posts} posts, ${complianceRate}% word count compliance`);
      
      if (platform === 'x' && stats.hashtagViolations > 0) {
        console.log(`  ❌ CRITICAL: ${stats.hashtagViolations} hashtag violations on X platform`);
      }
    });

    // Test Results
    const totalTests = 6;
    let passedTests = 0;
    
    console.log('\n🧪 TEST RESULTS:');
    
    // Test 1: Content Generation Success
    if (posts.length >= 10) {
      console.log('✅ Test 1: Content generation successful (10+ posts)');
      passedTests++;
    } else {
      console.log('❌ Test 1: Insufficient posts generated');
    }
    
    // Test 2: Event-Driven Content
    if (eventDrivenCount > 0) {
      console.log('✅ Test 2: Queensland event-driven content integrated');
      passedTests++;
    } else {
      console.log('❌ Test 2: No event-driven content detected');
    }
    
    // Test 3: Platform Diversity
    const platformCount = new Set(posts.map(p => p.platform)).size;
    if (platformCount >= 5) {
      console.log('✅ Test 3: All 5 platforms represented');
      passedTests++;
    } else {
      console.log(`❌ Test 3: Only ${platformCount} platforms represented`);
    }
    
    // Test 4: X Platform Hashtag Compliance
    if (platformCompliance.x.hashtagViolations === 0) {
      console.log('✅ Test 4: X platform hashtag compliance verified');
      passedTests++;
    } else {
      console.log('❌ Test 4: X platform hashtag violations detected');
    }
    
    // Test 5: Platform Compliance Metadata
    const postsWithCompliance = posts.filter(p => p.platformCompliance).length;
    if (postsWithCompliance >= posts.length * 0.8) {
      console.log('✅ Test 5: Platform compliance metadata present');
      passedTests++;
    } else {
      console.log('❌ Test 5: Missing platform compliance metadata');
    }
    
    // Test 6: Queensland Context
    const queenslandMentions = posts.filter(p => 
      p.content.toLowerCase().includes('queensland') || 
      p.content.toLowerCase().includes('brisbane') ||
      p.content.toLowerCase().includes('ekka')
    ).length;
    if (queenslandMentions >= posts.length * 0.5) {
      console.log('✅ Test 6: Queensland market context integrated');
      passedTests++;
    } else {
      console.log('❌ Test 6: Insufficient Queensland market context');
    }

    const successRate = Math.round(passedTests / totalTests * 100);
    console.log(`\n🎖️  OVERALL SUCCESS RATE: ${passedTests}/${totalTests} tests passed (${successRate}%)`);
    
    if (successRate >= 80) {
      console.log('🎉 QUEENSLAND EVENT-DRIVEN CONTENT GENERATION: SUCCESSFUL');
    } else {
      console.log('⚠️  QUEENSLAND EVENT-DRIVEN CONTENT GENERATION: NEEDS IMPROVEMENT');
    }

  } catch (error) {
    console.error('❌ Error testing Queensland event content:', error.message);
    if (error.response?.data) {
      console.error('Response data:', error.response.data);
    }
  }
}

testQueenslandEventContent();