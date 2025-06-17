/**
 * Facebook Reconnection Test
 * Tests the enhanced Facebook OAuth with publishing permissions
 */

import axios from 'axios';

async function testFacebookReconnection() {
  console.log('Testing Facebook Reconnection with Publishing Permissions...');
  
  try {
    // Test the Facebook reconnection endpoint
    const response = await axios.get('http://localhost:5000/api/reconnect/facebook', {
      withCredentials: true,
      headers: {
        'Cookie': 'connect.sid=s%3A...' // Session will be auto-established
      }
    });
    
    if (response.data.success) {
      console.log('✅ Facebook reconnection URL generated successfully');
      console.log('Auth URL includes permissions:', response.data.authUrl.includes('publish_to_groups'));
      console.log('Auth URL includes pages management:', response.data.authUrl.includes('pages_manage_posts'));
      
      // Extract scope from URL
      const scopeMatch = response.data.authUrl.match(/scope=([^&]+)/);
      if (scopeMatch) {
        const scope = decodeURIComponent(scopeMatch[1]);
        console.log('Facebook OAuth Scope:', scope);
        
        const requiredPermissions = [
          'public_profile',
          'pages_show_list', 
          'pages_manage_posts',
          'pages_read_engagement',
          'publish_to_groups',
          'pages_manage_engagement'
        ];
        
        const hasAllPermissions = requiredPermissions.every(perm => scope.includes(perm));
        console.log('Has all required permissions:', hasAllPermissions);
        
        if (hasAllPermissions) {
          console.log('✅ All Facebook publishing permissions are included');
        } else {
          const missing = requiredPermissions.filter(perm => !scope.includes(perm));
          console.log('❌ Missing permissions:', missing);
        }
      }
      
    } else {
      console.log('❌ Facebook reconnection failed:', response.data.message);
    }
    
  } catch (error) {
    if (error.response) {
      console.log('Facebook reconnection error:', error.response.data);
    } else {
      console.log('Connection error:', error.message);
    }
  }
}

testFacebookReconnection();