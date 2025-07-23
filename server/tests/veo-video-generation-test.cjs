const axios = require('axios');

// Configuration
const BASE_URL = process.env.BASE_URL || 'https://4fc77172-459a-4da7-8c33-5014abb1b73e-00-dqhtnud4ismj.worf.replit.dev';

// Set timeout
axios.defaults.timeout = 15000;

async function testVeoVideoGeneration() {
  console.log('🎬 VEO 2.0 VIDEO GENERATION SYSTEM TEST');
  console.log('Testing Queensland business video generation with JTBD framework...\n');

  const results = {};

  // Test 1: JTBD Prompt Generation
  try {
    console.log('🔬 Testing JTBD prompt generation...');
    const response = await axios.post(`${BASE_URL}/api/video/prompts/generate`, {
      businessContext: {
        businessName: 'Queensland Marketing Solutions',
        industry: 'Digital Marketing',
        targetAudience: 'Small business owners',
        location: 'Brisbane, Queensland',
        brandPurpose: 'Helping Queensland SMEs grow through strategic digital marketing'
      },
      videoType: 'cinematic',
      useJTBD: true
    }, {
      headers: { 'Content-Type': 'application/json' },
      validateStatus: (status) => status < 500
    });
    
    console.log(`Status: ${response.status}`);
    
    if (response.status === 200 && response.data) {
      const prompts = response.data;
      console.log(`Generated Prompts: ${prompts.prompts?.length || 'N/A'}`);
      
      if (prompts.prompts?.length > 0) {
        console.log(`✅ JTBD prompt generation WORKING - ${prompts.prompts.length} cinematic prompts generated`);
        console.log(`Sample prompt: ${prompts.prompts[0]?.videoPrompt?.substring(0, 100)}...`);
        results.jtbdGeneration = true;
      } else {
        console.log('❌ JTBD prompt generation returned empty results');
        results.jtbdGeneration = false;
      }
    } else {
      console.log(`❌ JTBD prompt generation returned ${response.status}`);
      console.log(`Response:`, response.data);
      results.jtbdGeneration = false;
    }
  } catch (error) {
    console.log('❌ JTBD prompt generation ERROR:', error.code || error.message);
    results.jtbdGeneration = false;
  }

  // Test 2: Google Cloud VEO Service Connection
  try {
    console.log('\n🔬 Testing Google Cloud VEO service connection...');
    const response = await axios.post(`${BASE_URL}/api/video/health-check`, {
      testCredentials: true
    }, {
      validateStatus: (status) => status < 500
    });
    
    console.log(`Status: ${response.status}`);
    console.log(`Response:`, response.data);
    
    if (response.status === 200 && response.data.status === 'healthy') {
      console.log('✅ Google Cloud VEO service ACCESSIBLE - Credentials working');
      results.veoConnection = true;
    } else if (response.status === 401) {
      console.log('⚠️ Google Cloud VEO service needs credential configuration');
      results.veoConnection = false;
    } else {
      console.log('❌ Google Cloud VEO service connection failed');
      results.veoConnection = false;
    }
  } catch (error) {
    console.log('❌ Google Cloud VEO service ERROR:', error.code || error.message);
    results.veoConnection = false;
  }

  // Test 3: Queensland Business Context Integration
  try {
    console.log('\n🔬 Testing Queensland business context integration...');
    const response = await axios.get(`${BASE_URL}/api/video/context/queensland`, {
      validateStatus: (status) => status < 500
    });
    
    console.log(`Status: ${response.status}`);
    
    if (response.status === 200 && response.data) {
      const context = response.data;
      console.log(`Queensland elements: ${context.elements?.length || 'N/A'}`);
      console.log(`Cultural references: ${context.culturalReferences?.length || 'N/A'}`);
      
      if (context.elements?.some(el => el.includes('Queensland'))) {
        console.log('✅ Queensland business context WORKING - Local elements integrated');
        results.queenslandContext = true;
      } else {
        console.log('❌ Queensland business context missing local elements');
        results.queenslandContext = false;
      }
    } else {
      console.log(`❌ Queensland business context returned ${response.status}`);
      results.queenslandContext = false;
    }
  } catch (error) {
    console.log('❌ Queensland business context ERROR:', error.code || error.message);
    results.queenslandContext = false;
  }

  // Test 4: Video Generation Request (Full Flow)
  try {
    console.log('\n🔬 Testing complete VEO video generation flow...');
    const response = await axios.post(`${BASE_URL}/api/video/generate`, {
      prompt: 'Professional Queensland business owner showcasing digital marketing solutions in modern Brisbane office',
      businessContext: {
        businessName: 'Test Marketing Agency',
        industry: 'Digital Marketing',
        location: 'Brisbane, Queensland',
        brandPurpose: 'Empowering Queensland SMEs with effective digital marketing'
      },
      videoType: 'cinematic',
      aspectRatio: '16:9',
      duration: 30,
      useJTBD: true
    }, {
      headers: { 'Content-Type': 'application/json' },
      validateStatus: (status) => status < 500
    });
    
    console.log(`Status: ${response.status}`);
    console.log(`Response:`, response.data);
    
    if (response.status === 200 && response.data.jobId) {
      console.log(`✅ VEO video generation REQUEST SUCCESSFUL - Job ID: ${response.data.jobId}`);
      console.log(`Estimated time: ${response.data.estimatedTime || 'N/A'}`);
      results.videoGeneration = true;
    } else if (response.status === 402) {
      console.log('⚠️ VEO video generation quota exceeded or payment required');
      results.videoGeneration = false;
    } else if (response.status === 401) {
      console.log('⚠️ VEO video generation requires authentication');
      results.videoGeneration = false;
    } else {
      console.log(`❌ VEO video generation failed with status ${response.status}`);
      results.videoGeneration = false;
    }
  } catch (error) {
    console.log('❌ VEO video generation ERROR:', error.code || error.message);
    results.videoGeneration = false;
  }

  // Test 5: Video Status Check Endpoint
  try {
    console.log('\n🔬 Testing video status check system...');
    const response = await axios.get(`${BASE_URL}/api/video/status/test_job_123`, {
      validateStatus: (status) => status < 500
    });
    
    console.log(`Status: ${response.status}`);
    
    if (response.status === 200 || response.status === 404) {
      console.log('✅ Video status check system OPERATIONAL');
      results.statusCheck = true;
    } else {
      console.log(`❌ Video status check returned ${response.status}`);
      results.statusCheck = false;
    }
  } catch (error) {
    console.log('❌ Video status check ERROR:', error.code || error.message);
    results.statusCheck = false;
  }

  // Test 6: Video Panel Component Readiness
  try {
    console.log('\n🔬 Testing video panel component endpoints...');
    const response = await axios.get(`${BASE_URL}/api/video/panel/config`, {
      validateStatus: (status) => status < 500
    });
    
    console.log(`Status: ${response.status}`);
    
    if (response.status === 200) {
      console.log('✅ Video panel component READY - Frontend integration working');
      results.videoPanelReady = true;
    } else if (response.status === 404) {
      console.log('⚠️ Video panel config endpoint not found - needs implementation');
      results.videoPanelReady = false;
    } else {
      console.log(`❌ Video panel component returned ${response.status}`);
      results.videoPanelReady = false;
    }
  } catch (error) {
    console.log('❌ Video panel component ERROR:', error.code || error.message);
    results.videoPanelReady = false;
  }

  // Summary
  const passedTests = Object.values(results).filter(Boolean).length;
  const totalTests = Object.keys(results).length;
  const successRate = ((passedTests / totalTests) * 100).toFixed(1);

  console.log('\n📋 VEO 2.0 VIDEO GENERATION SYSTEM SUMMARY');
  console.log('==========================================');
  console.log(`✅ Tests Passed: ${passedTests}/${totalTests} (${successRate}%)\n`);

  console.log('🎯 VEO SYSTEM COMPONENTS:');
  console.log(`JTBD Prompt Generation: ${results.jtbdGeneration ? '✅' : '❌'}`);
  console.log(`Google Cloud VEO Connection: ${results.veoConnection ? '✅' : '❌'}`);
  console.log(`Queensland Context Integration: ${results.queenslandContext ? '✅' : '❌'}`);
  console.log(`Video Generation Flow: ${results.videoGeneration ? '✅' : '❌'}`);
  console.log(`Status Check System: ${results.statusCheck ? '✅' : '❌'}`);
  console.log(`Video Panel Ready: ${results.videoPanelReady ? '✅' : '❌'}`);

  if (passedTests === totalTests) {
    console.log('\n🎉 VEO 2.0 video generation system fully operational for Queensland SMEs!');
  } else if (passedTests >= totalTests * 0.7) {
    console.log('\n✅ VEO 2.0 system mostly working - minor configuration needed.');
  } else {
    console.log('\n⚠️ VEO 2.0 system needs setup attention before Queensland deployment.');
  }

  return { passedTests, totalTests, results };
}

// Run the test
testVeoVideoGeneration().catch(console.error);