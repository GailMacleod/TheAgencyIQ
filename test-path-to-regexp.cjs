// Test to isolate the path-to-regexp issue
const express = require('express');
const app = express();

// Common patterns that might cause issues
const testPatterns = [
  '/api/posts/:id',
  '/api/posts/:',
  '/api/posts/:/test',
  '/api/posts:',
  '/api/posts/::',
  '/api/posts/:id:',
  '/api/posts/:id/',
  '/api/deletion-status/:userId',
  '/api/quota-status/:userId'
];

console.log('Testing route patterns for path-to-regexp errors...');

for (const pattern of testPatterns) {
  try {
    const testApp = express();
    testApp.get(pattern, (req, res) => {});
    console.log(`✅ Pattern works: ${pattern}`);
  } catch (error) {
    console.log(`❌ Pattern ERROR: ${pattern}`);
    console.log(`   Error: ${error.message}`);
    if (error.message.includes('Missing parameter name')) {
      console.log('   ⚠️  This is the problematic pattern!');
    }
  }
}

console.log('Test complete.');