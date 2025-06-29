#!/usr/bin/env node

import axios from 'axios';
import { storage } from './server/storage.js';

async function refreshFacebookToken() {
  try {
    console.log('🔄 Testing Facebook token refresh with FACEBOOK_REFRESH_TOKEN...');
    
    const refreshToken = process.env.FACEBOOK_REFRESH_TOKEN;
    if (!refreshToken) {
      console.error('❌ FACEBOOK_REFRESH_TOKEN not found in environment');
      return;
    }
    
    console.log('✅ FACEBOOK_REFRESH_TOKEN found');
    console.log('🔄 Calling Facebook Graph API for token exchange...');
    
    const response = await axios.get('https://graph.facebook.com/v18.0/oauth/access_token', {
      params: {
        grant_type: 'fb_exchange_token',
        client_id: process.env.FACEBOOK_APP_ID,
        client_secret: process.env.FACEBOOK_APP_SECRET,
        fb_exchange_token: refreshToken
      }
    });

    const { access_token, expires_in } = response.data;
    console.log('✅ New access token received:', access_token.substring(0, 20) + '...');
    console.log('✅ Expires in:', expires_in, 'seconds');
    
    // Update database connections
    const connections = await storage.getPlatformConnectionsByPlatform('facebook');
    console.log(`📊 Found ${connections.length} Facebook connections to update`);
    
    for (const connection of connections) {
      await storage.updatePlatformConnection(connection.id, {
        accessToken: access_token,
        isActive: true,
        lastError: null
      });
      console.log(`✅ Updated connection ID ${connection.id} for user ${connection.userId}`);
    }
    
    console.log('🎉 Facebook token refresh completed successfully!');
    
  } catch (error) {
    console.error('❌ Facebook token refresh failed:', error.response?.data || error.message);
  }
}

refreshFacebookToken();