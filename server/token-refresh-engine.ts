/**
 * TOKEN REFRESH ENGINE - OAuth Token Management
 * Keeps all platform connections alive with automatic refresh
 */

import { db } from './db';
import { oauthTokens } from '../shared/schema';
import { eq, lt } from 'drizzle-orm';

interface TokenRefreshConfig {
  platform: string;
  tokenUrl: string;
  clientIdEnv: string;
  clientSecretEnv: string;
}

const PLATFORM_CONFIGS: TokenRefreshConfig[] = [
  {
    platform: 'x',
    tokenUrl: 'https://api.twitter.com/2/oauth2/token',
    clientIdEnv: 'X_CLIENT_ID',
    clientSecretEnv: 'X_CLIENT_SECRET'
  },
  {
    platform: 'youtube',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    clientIdEnv: 'YOUTUBE_CLIENT_ID',
    clientSecretEnv: 'YOUTUBE_CLIENT_SECRET'
  },
  {
    platform: 'linkedin',
    tokenUrl: 'https://www.linkedin.com/oauth/v2/accessToken',
    clientIdEnv: 'LINKEDIN_CLIENT_ID',
    clientSecretEnv: 'LINKEDIN_CLIENT_SECRET'
  },
  {
    platform: 'facebook',
    tokenUrl: 'https://graph.facebook.com/v18.0/oauth/access_token',
    clientIdEnv: 'FACEBOOK_APP_ID',
    clientSecretEnv: 'FACEBOOK_APP_SECRET'
  }
];

export const refreshAllTokens = async (): Promise<{ refreshed: number; errors: string[] }> => {
  console.log('[TOKEN-REFRESH] Starting automatic token refresh...');
  
  let refreshed = 0;
  const errors: string[] = [];
  
  for (const config of PLATFORM_CONFIGS) {
    try {
      const result = await refreshPlatformTokens(config);
      if (result.success) {
        refreshed += result.count;
      } else {
        errors.push(`${config.platform}: ${result.error}`);
      }
    } catch (error) {
      errors.push(`${config.platform}: ${error.message}`);
    }
  }
  
  console.log(`[TOKEN-REFRESH] Complete: ${refreshed} tokens refreshed, ${errors.length} errors`);
  return { refreshed, errors };
};

const refreshPlatformTokens = async (config: TokenRefreshConfig): Promise<{ success: boolean; count: number; error?: string }> => {
  try {
    // Find tokens expiring in the next hour
    const expiringTokens = await db
      .select()
      .from(oauthTokens)
      .where(
        eq(oauthTokens.platform, config.platform)
      );
    
    let refreshCount = 0;
    
    for (const token of expiringTokens) {
      // Check if token needs refresh (expires within 1 hour)
      const expiresAt = new Date(token.expiresAt);
      const oneHourFromNow = new Date(Date.now() + 60 * 60 * 1000);
      
      if (expiresAt < oneHourFromNow && token.refreshToken) {
        const refreshResult = await refreshSingleToken(config, token);
        if (refreshResult.success) {
          refreshCount++;
        }
      }
    }
    
    return { success: true, count: refreshCount };
    
  } catch (error) {
    console.error(`[TOKEN-REFRESH] ${config.platform} error:`, error);
    return { success: false, count: 0, error: error.message };
  }
};

const refreshSingleToken = async (config: TokenRefreshConfig, token: any): Promise<{ success: boolean; error?: string }> => {
  try {
    const clientId = process.env[config.clientIdEnv];
    const clientSecret = process.env[config.clientSecretEnv];
    
    if (!clientId || !clientSecret) {
      return { success: false, error: 'Missing client credentials' };
    }
    
    const params = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: token.refreshToken,
      client_id: clientId,
      client_secret: clientSecret
    });
    
    const response = await fetch(config.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
      body: params.toString()
    });
    
    const data = await response.json();
    
    if (data.access_token) {
      // Update token in database
      await db
        .update(oauthTokens)
        .set({
          accessToken: data.access_token,
          expiresAt: new Date(Date.now() + (data.expires_in || 3600) * 1000),
          refreshToken: data.refresh_token || token.refreshToken, // Keep old refresh token if new one not provided
          updatedAt: new Date()
        })
        .where(eq(oauthTokens.id, token.id));
      
      console.log(`[TOKEN-REFRESH] ${config.platform} token refreshed successfully`);
      return { success: true };
    } else {
      return { success: false, error: data.error_description || 'No access token in response' };
    }
    
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Schedule automatic refresh every hour
export const startTokenRefreshScheduler = () => {
  console.log('[TOKEN-REFRESH] Starting hourly refresh scheduler...');
  
  // Refresh immediately on startup
  setTimeout(refreshAllTokens, 5000);
  
  // Then refresh every hour
  setInterval(refreshAllTokens, 60 * 60 * 1000);
};