/**
 * Create LinkedIn Test Connection
 * Creates a test LinkedIn connection to verify token validation works
 */
const axios = require('axios');

async function createLinkedInTestConnection() {
  try {
    console.log('🔍 Creating LinkedIn test connection...');
    
    // Create a test LinkedIn connection with a placeholder token
    const testConnection = {
      platform: 'linkedin',
      platformUserId: 'test_user_123',
      platformUsername: 'Test LinkedIn User',
      accessToken: 'test_token_for_validation',
      refreshToken: null,
      isActive: true
    };
    
    // First, check if we can create the connection via API
    const createResponse = await axios.post('https://4fc77172-459a-4da7-8c33-5014abb1b73e-00-dqhtnud4ismj.worf.replit.dev/api/platform-connections', testConnection, {
      headers: {
        'Cookie': 'theagencyiq.session=s%3Aaiq_md10oner_zzltawpuqz.gYlCRNuFBOsoUjYhiJNYGPf6kNOnk8SvzUElLWNXR0w',
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ LinkedIn test connection created successfully');
    console.log('📋 Response:', createResponse.data);
    
    // Now verify the connection was created
    const connectionsResponse = await axios.get('https://4fc77172-459a-4da7-8c33-5014abb1b73e-00-dqhtnud4ismj.worf.replit.dev/api/platform-connections', {
      headers: {
        'Cookie': 'theagencyiq.session=s%3Aaiq_md10oner_zzltawpuqz.gYlCRNuFBOsoUjYhiJNYGPf6kNOnk8SvzUElLWNXR0w'
      }
    });
    
    console.log('📋 Updated platform connections:');
    connectionsResponse.data.forEach(conn => {
      console.log(`- ${conn.platform}: ${conn.platformUsername} (${conn.isActive ? 'Active' : 'Inactive'})`);
    });
    
    // Find the LinkedIn connection
    const linkedinConnection = connectionsResponse.data.find(conn => conn.platform === 'linkedin');
    
    if (linkedinConnection) {
      console.log('\n✅ LinkedIn connection found in database');
      console.log('📋 LinkedIn connection details:');
      console.log(`- Platform User ID: ${linkedinConnection.platformUserId}`);
      console.log(`- Platform Username: ${linkedinConnection.platformUsername}`);
      console.log(`- Is Active: ${linkedinConnection.isActive}`);
      console.log(`- Has Access Token: ${linkedinConnection.accessToken ? 'Yes' : 'No'}`);
      
      // Test the token validation API structure
      console.log('\n🔍 Testing LinkedIn token validation API structure...');
      console.log('📋 Token validation endpoint: https://api.linkedin.com/v1/people/~?oauth2_access_token=YOUR-TOKEN');
      console.log('📋 Expected behavior: Success = live token, Error = expired token');
      console.log('📋 Token lifespan: 60 days');
      
      // Test with the test token (should fail)
      try {
        const linkedinApiResponse = await axios.get('https://api.linkedin.com/v1/people/~?oauth2_access_token=' + linkedinConnection.accessToken, {
          headers: {
            'Accept': 'application/json'
          },
          timeout: 10000
        });
        
        console.log('✅ LinkedIn token is VALID (unexpected for test token)');
        console.log('📋 LinkedIn API response:');
        console.log(JSON.stringify(linkedinApiResponse.data, null, 2));
        
      } catch (linkedinError) {
        console.log('❌ LinkedIn token is EXPIRED or INVALID (expected for test token)');
        console.log('📋 LinkedIn API error:');
        console.log('- Status:', linkedinError.response?.status);
        console.log('- Message:', linkedinError.response?.data?.message || linkedinError.message);
        
        if (linkedinError.response?.status === 401) {
          console.log('🔄 Token expired - OAuth reconnection needed');
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Error creating LinkedIn test connection:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    }
  }
}

createLinkedInTestConnection();