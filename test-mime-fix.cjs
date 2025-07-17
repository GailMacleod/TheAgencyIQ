#!/usr/bin/env node

/**
 * Test script to validate MIME type fixes for JavaScript modules
 * Tests that the server now serves .js, .jsx, .ts, .tsx files with correct MIME types
 */

const axios = require('axios');
const assert = require('assert');

const CONFIG = {
  baseUrl: 'http://localhost:5000',
  timeout: 10000
};

async function testMimeTypes() {
  console.log('🧪 Testing MIME Type Fixes for JavaScript Modules\n');
  
  const testFiles = [
    { path: '/src/main.tsx', expectedType: 'application/javascript', description: 'Main TypeScript React file' },
    { path: '/src/App.tsx', expectedType: 'application/javascript', description: 'App TypeScript React file' },
    { path: '/index.html', expectedType: 'text/html', description: 'HTML index file' },
    { path: '/src/index.css', expectedType: 'text/css', description: 'CSS file' }
  ];
  
  let passed = 0;
  let failed = 0;
  
  for (const test of testFiles) {
    try {
      const response = await axios.head(`${CONFIG.baseUrl}${test.path}`, {
        timeout: CONFIG.timeout
      });
      
      const contentType = response.headers['content-type'];
      const isCorrect = contentType && contentType.includes(test.expectedType);
      
      if (isCorrect) {
        console.log(`✅ ${test.description}: ${contentType}`);
        passed++;
      } else {
        console.log(`❌ ${test.description}: Expected ${test.expectedType}, got ${contentType}`);
        failed++;
      }
    } catch (error) {
      console.log(`❌ ${test.description}: Request failed - ${error.message}`);
      failed++;
    }
  }
  
  console.log(`\n📊 Test Results: ${passed} passed, ${failed} failed`);
  
  // Test actual content loading
  try {
    const mainResponse = await axios.get(`${CONFIG.baseUrl}/src/main.tsx`, {
      timeout: CONFIG.timeout
    });
    
    const hasImports = mainResponse.data.includes('import');
    const hasReact = mainResponse.data.includes('react');
    
    if (hasImports && hasReact) {
      console.log('✅ Module content loading: TypeScript/React code served correctly');
      passed++;
    } else {
      console.log('❌ Module content loading: TypeScript/React code not found');
      failed++;
    }
  } catch (error) {
    console.log(`❌ Module content loading: ${error.message}`);
    failed++;
  }
  
  console.log(`\n🎯 Final Results: ${passed} passed, ${failed} failed`);
  console.log(`🏆 MIME Type Fix Status: ${failed === 0 ? 'SUCCESS' : 'NEEDS ATTENTION'}`);
  
  return failed === 0;
}

// Run test
if (require.main === module) {
  testMimeTypes().catch(console.error);
}

module.exports = { testMimeTypes };