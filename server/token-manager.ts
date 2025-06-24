/**
 * OAUTH TOKEN PERSISTENCE AND REFRESH SYSTEM
 * Replit-native token management with database storage
 */

import { db } from './db';
import { sql } from 'drizzle-orm';

interface TokenData {
  platform: string;
  access_token: string;
  refresh_token: string;
  expires_at: Date;
}

const refreshTokens = async () => {
  console.log('[TOKEN-MGR] Starting token refresh cycle...');
  
  const platforms = ['x', 'youtube', 'linkedin', 'facebook', 'instagram'];
  
  for (const platform of platforms) {
    try {
      // Get existing token from database
      const tokenResult = await db.execute(sql`
        SELECT refresh_token, expires_at, access_token 
        FROM oauth_tokens 
        WHERE platform = ${platform} 
        LIMIT 1
      `);
      
      if (tokenResult.rows.length === 0) {
        console.log(`[TOKEN-MGR] No token found for ${platform}`);
        continue;
      }
      
      const token = tokenResult.rows[0] as any;
      const expiresAt = new Date(token.expires_at);
      const now = new Date();
      
      // Check if token needs refresh (expires within 1 hour)
      if (expiresAt.getTime() - now.getTime() > 3600000) {
        console.log(`[TOKEN-MGR] Token for ${platform} still valid`);
        continue;
      }
      
      console.log(`[TOKEN-MGR] Refreshing token for ${platform}...`);
      
      // Platform-specific refresh endpoints
      const refreshEndpoints: Record<string, string> = {
        x: 'https://api.twitter.com/2/oauth2/token',
        youtube: 'https://oauth2.googleapis.com/token',
        linkedin: 'https://www.linkedin.com/oauth/v2/accessToken',
        facebook: 'https://graph.facebook.com/oauth/access_token',
        instagram: 'https://graph.facebook.com/oauth/access_token'
      };
      
      const endpoint = refreshEndpoints[platform];
      if (!endpoint) {
        console.log(`[TOKEN-MGR] No refresh endpoint for ${platform}`);
        continue;
      }
      
      const clientId = process.env[`${platform.toUpperCase()}_CLIENT_ID`];
      const clientSecret = process.env[`${platform.toUpperCase()}_CLIENT_SECRET`];
      
      if (!clientId || !clientSecret) {
        console.log(`[TOKEN-MGR] Missing credentials for ${platform}`);
        continue;
      }
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `grant_type=refresh_token&refresh_token=${token.refresh_token}&client_id=${clientId}&client_secret=${clientSecret}`
      });
      
      const data = await response.json();
      
      if (data.access_token) {
        const newExpiresAt = new Date(Date.now() + (data.expires_in || 3600) * 1000);
        
        await db.execute(sql`
          UPDATE oauth_tokens 
          SET access_token = ${data.access_token}, 
              expires_at = ${newExpiresAt.toISOString()},
              updated_at = NOW()
          WHERE platform = ${platform}
        `);
        
        console.log(`[TOKEN-MGR] Successfully refreshed token for ${platform}`);
      } else {
        console.error(`[TOKEN-MGR] Failed to refresh token for ${platform}:`, data);
      }
      
    } catch (error) {
      console.error(`[TOKEN-MGR] Error refreshing ${platform} token:`, error);
    }
  }
  
  console.log('[TOKEN-MGR] Token refresh cycle completed');
};

const getValidToken = async (platform: string): Promise<string | null> => {
  try {
    const tokenResult = await db.execute(sql`
      SELECT access_token, expires_at 
      FROM oauth_tokens 
      WHERE platform = ${platform} 
      LIMIT 1
    `);
    
    if (tokenResult.rows.length === 0) {
      return null;
    }
    
    const token = tokenResult.rows[0] as any;
    const expiresAt = new Date(token.expires_at);
    const now = new Date();
    
    if (expiresAt > now) {
      return token.access_token;
    }
    
    return null;
  } catch (error) {
    console.error(`[TOKEN-MGR] Error getting token for ${platform}:`, error);
    return null;
  }
};

const storeToken = async (tokenData: TokenData): Promise<void> => {
  try {
    await db.execute(sql`
      INSERT INTO oauth_tokens (platform, access_token, refresh_token, expires_at)
      VALUES (${tokenData.platform}, ${tokenData.access_token}, ${tokenData.refresh_token}, ${tokenData.expires_at.toISOString()})
      ON CONFLICT (platform) 
      DO UPDATE SET 
        access_token = EXCLUDED.access_token,
        refresh_token = EXCLUDED.refresh_token,
        expires_at = EXCLUDED.expires_at,
        updated_at = NOW()
    `);
    
    console.log(`[TOKEN-MGR] Stored token for ${tokenData.platform}`);
  } catch (error) {
    console.error(`[TOKEN-MGR] Error storing token for ${tokenData.platform}:`, error);
  }
};

// Auto-refresh tokens every hour
setInterval(refreshTokens, 3600000);

export { refreshTokens, getValidToken, storeToken };