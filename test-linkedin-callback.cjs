/**
 * Test LinkedIn OAuth Callback Flow
 */
const axios = require('axios');

async function testLinkedInCallback() {
  try {
    console.log('🔍 Testing LinkedIn OAuth callback flow...');
    
    // First, establish a session
    const sessionResponse = await axios.post('https://4fc77172-459a-4da7-8c33-5014abb1b73e-00-dqhtnud4ismj.worf.replit.dev/api/auth/establish-session', {}, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Session established');
    const cookies = sessionResponse.headers['set-cookie'];
    const sessionCookie = cookies.find(cookie => cookie.includes('theagencyiq.session'));
    
    if (!sessionCookie) {
      throw new Error('No session cookie found');
    }
    
    // Now test the LinkedIn OAuth initiation
    const linkedinResponse = await axios.get('https://4fc77172-459a-4da7-8c33-5014abb1b73e-00-dqhtnud4ismj.worf.replit.dev/auth/linkedin', {
      headers: {
        'Cookie': sessionCookie
      },
      maxRedirects: 0,
      validateStatus: function (status) {
        return status >= 200 && status < 400; // Accept redirects
      }
    });
    
    console.log('🔍 LinkedIn OAuth initiation status:', linkedinResponse.status);
    console.log('🔍 LinkedIn OAuth redirect URL:', linkedinResponse.headers.location);
    
    // Check if the callback URL is properly configured
    if (linkedinResponse.headers.location) {
      const url = new URL(linkedinResponse.headers.location);
      console.log('🔍 LinkedIn OAuth URL breakdown:');
      console.log('- Base URL:', url.origin + url.pathname);
      console.log('- Client ID:', url.searchParams.get('client_id'));
      console.log('- Redirect URI:', url.searchParams.get('redirect_uri'));
      console.log('- Scope:', url.searchParams.get('scope'));
      console.log('- Response Type:', url.searchParams.get('response_type'));
    }
    
  } catch (error) {
    console.error('❌ Error testing LinkedIn OAuth callback:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Headers:', error.response.headers);
    }
  }
}

testLinkedInCallback();