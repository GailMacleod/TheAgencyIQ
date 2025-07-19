#!/usr/bin/env node

/**
 * DEBUG POST CREATION ISSUES
 * Detailed analysis of post creation schema validation failures
 */

const axios = require('axios');

const BASE_URL = 'https://4fc77172-459a-4da7-8c33-5014abb1b73e-00-dqhtnud4ismj.worf.replit.dev';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  },
  withCredentials: true
});

async function debugPostCreation() {
  console.log('🔍 Testing different post creation payloads...\n');

  // Test 1: Minimal required fields only
  const test1 = {
    content: "Test post - minimal fields",
    platform: "linkedin", 
    userId: 2
  };

  console.log('Test 1 - Minimal fields:', JSON.stringify(test1, null, 2));
  try {
    const response = await api.post('/api/posts', test1);
    console.log('✅ Test 1 SUCCESS:', response.status, response.data);
  } catch (error) {
    console.log('❌ Test 1 FAILED:', error.response?.status, error.response?.data);
  }
  console.log('');

  // Test 2: With status field
  const test2 = {
    content: "Test post - with status",
    platform: "linkedin",
    status: "draft",
    userId: 2
  };

  console.log('Test 2 - With status:', JSON.stringify(test2, null, 2));
  try {
    const response = await api.post('/api/posts', test2);
    console.log('✅ Test 2 SUCCESS:', response.status, response.data);
  } catch (error) {
    console.log('❌ Test 2 FAILED:', error.response?.status, error.response?.data);
  }
  console.log('');

  // Test 3: With scheduledFor
  const test3 = {
    content: "Test post - with schedule",
    platform: "linkedin",
    status: "draft",
    scheduledFor: new Date(Date.now() + 3600000).toISOString(),
    userId: 2
  };

  console.log('Test 3 - With schedule:', JSON.stringify(test3, null, 2));
  try {
    const response = await api.post('/api/posts', test3);
    console.log('✅ Test 3 SUCCESS:', response.status, response.data);
  } catch (error) {
    console.log('❌ Test 3 FAILED:', error.response?.status, error.response?.data);
  }
  console.log('');

  // Test 4: Different platform values
  const platforms = ['facebook', 'instagram', 'linkedin', 'youtube', 'x'];
  for (const platform of platforms) {
    const testPlatform = {
      content: `Test post for ${platform}`,
      platform: platform,
      status: "draft",
      userId: 2
    };

    console.log(`Test ${platform}:`, JSON.stringify(testPlatform, null, 2));
    try {
      const response = await api.post('/api/posts', testPlatform);
      console.log(`✅ ${platform} SUCCESS:`, response.status, response.data?.id);
    } catch (error) {
      console.log(`❌ ${platform} FAILED:`, error.response?.status, error.response?.data);
    }
  }
}

async function debugDirectPublish() {
  console.log('\n🔍 Testing direct publish endpoint...\n');

  // Test the updated endpoint with test_publish_validation
  const testAction = {
    action: 'test_publish_validation'
  };

  console.log('Direct Publish Test:', JSON.stringify(testAction, null, 2));
  try {
    const response = await api.post('/api/direct-publish', testAction);
    console.log('✅ Direct Publish SUCCESS:', response.status, response.data);
  } catch (error) {
    console.log('❌ Direct Publish FAILED:', error.response?.status, error.response?.data);
  }
}

async function runDebug() {
  await debugPostCreation();
  await debugDirectPublish();
}

runDebug().catch(console.error);