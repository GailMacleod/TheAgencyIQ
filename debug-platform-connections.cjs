/**
 * Debug Platform Connections API Response
 */
const axios = require('axios');

async function debugPlatformConnections() {
  try {
    console.log('🔍 Debugging platform connections API...');
    
    const response = await axios.get('https://4fc77172-459a-4da7-8c33-5014abb1b73e-00-dqhtnud4ismj.worf.replit.dev/api/platform-connections', {
      headers: {
        'Cookie': 'theagencyiq.session=s%3Aaiq_md10oner_zzltawpuqz.gYlCRNuFBOsoUjYhiJNYGPf6kNOnk8SvzUElLWNXR0w'
      }
    });
    
    console.log('📋 Platform connections response:');
    console.log(JSON.stringify(response.data, null, 2));
    
    // Check LinkedIn specifically
    const linkedinConnection = response.data.find(conn => conn.platform === 'linkedin');
    
    if (linkedinConnection) {
      console.log('✅ LinkedIn connection found:');
      console.log('  Platform:', linkedinConnection.platform);
      console.log('  Is Active:', linkedinConnection.isActive);
      console.log('  OAuth Status:', linkedinConnection.oauthStatus);
      console.log('  Username:', linkedinConnection.platformUsername);
    } else {
      console.log('❌ No LinkedIn connection found in response');
    }
    
  } catch (error) {
    console.error('❌ Error debugging platform connections:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    }
  }
}

debugPlatformConnections();