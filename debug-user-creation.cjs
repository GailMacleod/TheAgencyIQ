/**
 * Debug User Creation Issue
 * Test user creation endpoint to identify the authentication problem
 */

const axios = require('axios');

const BASE_URL = 'https://4fc77172-459a-4da7-8c33-5014abb1b73e-00-dqhtnud4ismj.worf.replit.dev';

async function debugUserCreation() {
  console.log('🔍 DEBUGGING USER CREATION ISSUE');
  
  try {
    // Test user creation endpoint
    const testUser = {
      email: 'test@example.com',
      phone: '+61400000000',
      password: 'testpassword123',
      confirmPassword: 'testpassword123',
      userId: 'test-user-001'
    };
    
    console.log('📋 Test user data:', testUser);
    
    const response = await axios.post(`${BASE_URL}/api/auth/signup`, testUser, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ User creation successful:', response.data);
    
  } catch (error) {
    console.log('❌ User creation failed:', error.response?.status, error.response?.data);
    
    // Check detailed error information
    if (error.response) {
      console.log('📋 Error details:', {
        status: error.response.status,
        headers: error.response.headers,
        data: error.response.data
      });
    }
  }
}

debugUserCreation();