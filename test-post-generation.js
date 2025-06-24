// Test script to verify PostCountManager prevents doubling
import fs from 'fs';

console.log('Testing PostCountManager implementation...');

// Read current posts-db.json state
const postsDbPath = './posts-db.json';
if (fs.existsSync(postsDbPath)) {
  const currentState = JSON.parse(fs.readFileSync(postsDbPath, 'utf8'));
  console.log('Current posts-db.json state:', JSON.stringify(currentState, null, 2));
}

// Simulate API call to test quota enforcement
async function testPostGeneration() {
  try {
    const response = await fetch('http://localhost:5000/api/brand-posts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': 'connect.sid=test'
      },
      body: JSON.stringify({
        goals: { sales: true },
        targets: { conversion: 3 },
        text: 'Test quota enforcement',
        brandPurpose: {
          brandName: 'The Agency IQ',
          corePurpose: 'Test post generation'
        }
      })
    });

    const result = await response.json();
    console.log('Post generation result:', result);
    
    // Check updated state
    if (fs.existsSync(postsDbPath)) {
      const updatedState = JSON.parse(fs.readFileSync(postsDbPath, 'utf8'));
      console.log('Updated posts-db.json state:', JSON.stringify(updatedState, null, 2));
    }
    
  } catch (error) {
    console.error('Test error:', error.message);
  }
}

testPostGeneration();