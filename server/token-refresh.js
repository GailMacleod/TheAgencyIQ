const { db } = require('./db');
const { oauthTokens } = require('../shared/schema');
const { eq } = require('drizzle-orm');

const refreshTokens = async () => {
  console.log('[TOKEN-REFRESH] Starting...');
  const platforms = ['x', 'youtube', 'linkedin', 'facebook'];
  
  for (const platform of platforms) {
    try {
      const token = await db.select({ 
        refresh: oauthTokens.refreshToken, 
        expires: oauthTokens.expiresAt 
      }).from(oauthTokens).where(eq(oauthTokens.platform, platform)).get();
      
      if (token && new Date(token.expires) < new Date()) {
        console.log(`[TOKEN-REFRESH] Refreshing ${platform}...`);
        
        const response = await fetch(`https://${platform === 'x' ? 'api.twitter.com' : platform}.com/oauth2/token`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: `grant_type=refresh_token&refresh_token=${token.refresh}&client_id=${process.env[`${platform.toUpperCase()}_CLIENT_ID`]}&client_secret=${process.env[`${platform.toUpperCase()}_CLIENT_SECRET`]}`
        });
        
        const data = await response.json();
        if (data.access_token) {
          await db.update(oauthTokens).set({ 
            accessToken: data.access_token, 
            expiresAt: new Date(Date.now() + data.expires_in * 1000) 
          }).where(eq(oauthTokens.platform, platform));
          console.log(`[TOKEN-REFRESH] ${platform} refreshed`);
        }
      }
    } catch (error) {
      console.error(`[ERROR] ${platform} refresh failed: ${error.message}`);
    }
  }
};

module.exports = { refreshTokens };