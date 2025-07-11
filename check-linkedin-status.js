/**
 * Check LinkedIn connection status
 */

async function checkLinkedInStatus() {
  const baseUrl = 'https://4fc77172-459a-4da7-8c33-5014abb1b73e-00-dqhtnud4ismj.worf.replit.dev';
  
  try {
    const response = await fetch(`${baseUrl}/api/platform-connections`, {
      credentials: 'include'
    });
    
    const connections = await response.json();
    
    // Filter for LinkedIn connections
    const linkedinConnections = connections.filter(conn => conn.platform === 'linkedin');
    
    console.log('LinkedIn Connection Status:');
    console.log('==========================');
    console.log(`Total LinkedIn connections: ${linkedinConnections.length}`);
    
    if (linkedinConnections.length > 0) {
      // Get the most recent LinkedIn connection
      const latest = linkedinConnections.sort((a, b) => new Date(b.connectedAt) - new Date(a.connectedAt))[0];
      
      console.log('\nLatest LinkedIn Connection:');
      console.log(`- Connected: ${latest.connectedAt}`);
      console.log(`- Active: ${latest.isActive}`);
      console.log(`- Username: ${latest.platformUsername}`);
      console.log(`- OAuth Status: ${latest.oauthStatus?.isValid ? 'Valid' : 'Invalid'}`);
      
      if (latest.oauthStatus?.error) {
        console.log(`- Error: ${latest.oauthStatus.error}`);
      }
      
      if (latest.oauthStatus?.needsReauth) {
        console.log('- Status: Needs re-authentication');
      }
    } else {
      console.log('No LinkedIn connections found');
    }
    
    // Check if LinkedIn OAuth URL is working
    console.log('\nTesting LinkedIn OAuth URL...');
    const oauthResponse = await fetch(`${baseUrl}/connect/linkedin`, {
      method: 'GET',
      credentials: 'include',
      redirect: 'manual'
    });
    
    if (oauthResponse.status === 302) {
      const location = oauthResponse.headers.get('location');
      const hasClientId = location.includes('client_id=') && !location.includes('client_id=undefined');
      
      console.log(`✅ LinkedIn OAuth URL generated successfully`);
      console.log(`   Client ID present: ${hasClientId ? 'Yes' : 'No'}`);
      console.log(`   Scopes: ${location.includes('w_member_social') ? 'Publishing scopes present' : 'Missing publishing scopes'}`);
    } else {
      console.log(`❌ LinkedIn OAuth URL generation failed: ${oauthResponse.status}`);
    }
    
  } catch (error) {
    console.error('Error checking LinkedIn status:', error.message);
  }
}

checkLinkedInStatus();