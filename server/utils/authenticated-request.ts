import { db } from '../db';
import { oauthTokens } from '@shared/schema';
import { eq, and } from 'drizzle-orm';

interface AuthenticatedRequestOptions {
  userId: string;
  platform: string;
  url: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: any;
  headers?: Record<string, string>;
  maxRetries?: number;
}

export async function makeAuthenticatedRequest(options: AuthenticatedRequestOptions): Promise<Response> {
  const { userId, platform, url, method = 'GET', body, headers = {}, maxRetries = 1 } = options;
  
  let attempts = 0;
  
  while (attempts <= maxRetries) {
    attempts++;
    
    try {
      // Get current token from database
      const [tokenRecord] = await db
        .select()
        .from(oauthTokens)
        .where(and(
          eq(oauthTokens.userId, userId),
          eq(oauthTokens.platform, platform)
        ));

      if (!tokenRecord || !tokenRecord.isValid) {
        throw new Error(`No valid ${platform} token found for user ${userId}`);
      }

      // Check if token is expired
      if (tokenRecord.expiresAt && new Date() > tokenRecord.expiresAt) {
        console.log(`🔄 Token expired for ${platform}, attempting refresh...`);
        await refreshTokenInDatabase(tokenRecord);
        continue; // Retry with refreshed token
      }

      // Make the authenticated request
      const requestHeaders = {
        'Authorization': `Bearer ${tokenRecord.accessToken}`,
        'Content-Type': 'application/json',
        ...headers
      };

      const response = await fetch(url, {
        method,
        headers: requestHeaders,
        body: body ? JSON.stringify(body) : undefined
      });

      // Handle 401 - token invalid/expired
      if (response.status === 401 && attempts <= maxRetries) {
        console.log(`🔄 Received 401 for ${platform}, attempting token refresh...`);
        
        try {
          await refreshTokenInDatabase(tokenRecord);
          continue; // Retry with refreshed token
        } catch (refreshError) {
          console.error(`❌ Token refresh failed for ${platform}:`, refreshError);
          // Mark token as invalid
          await db
            .update(oauthTokens)
            .set({ isValid: false, updatedAt: new Date() })
            .where(eq(oauthTokens.id, tokenRecord.id));
          
          throw new Error(`Token refresh failed for ${platform}. Please reconnect your account.`);
        }
      }

      if (!response.ok && response.status !== 401) {
        throw new Error(`${platform} API request failed: ${response.status} ${response.statusText}`);
      }

      return response;

    } catch (error: any) {
      if (attempts > maxRetries) {
        console.error(`❌ Authenticated request failed after ${maxRetries + 1} attempts:`, error);
        throw error;
      }
      
      console.log(`⚠️ Request attempt ${attempts} failed, retrying...`);
      await new Promise(resolve => setTimeout(resolve, 1000 * attempts)); // Exponential backoff
    }
  }

  throw new Error('All retry attempts exhausted');
}

async function refreshTokenInDatabase(tokenRecord: any): Promise<void> {
  try {
    let refreshResponse;
    
    switch (tokenRecord.provider) {
      case 'google':
        refreshResponse = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_id: process.env.GOOGLE_CLIENT_ID!,
            client_secret: process.env.GOOGLE_CLIENT_SECRET!,
            refresh_token: tokenRecord.refreshToken,
            grant_type: 'refresh_token'
          })
        });
        break;
        
      case 'facebook':
        refreshResponse = await fetch(`https://graph.facebook.com/oauth/access_token?grant_type=fb_exchange_token&client_id=${process.env.FACEBOOK_CLIENT_ID}&client_secret=${process.env.FACEBOOK_CLIENT_SECRET}&fb_exchange_token=${tokenRecord.accessToken}`);
        break;
        
      case 'linkedin':
        refreshResponse = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            grant_type: 'refresh_token',
            refresh_token: tokenRecord.refreshToken,
            client_id: process.env.LINKEDIN_CLIENT_ID!,
            client_secret: process.env.LINKEDIN_CLIENT_SECRET!
          })
        });
        break;
        
      default:
        throw new Error(`Refresh not supported for provider: ${tokenRecord.provider}`);
    }

    if (!refreshResponse.ok) {
      throw new Error(`Token refresh failed: ${refreshResponse.statusText}`);
    }

    const newTokens = await refreshResponse.json();

    // Update token in database
    await db
      .update(oauthTokens)
      .set({
        accessToken: newTokens.access_token,
        refreshToken: newTokens.refresh_token || tokenRecord.refreshToken,
        expiresAt: new Date(Date.now() + (newTokens.expires_in * 1000)),
        isValid: true,
        updatedAt: new Date()
      })
      .where(eq(oauthTokens.id, tokenRecord.id));

    console.log(`✅ Token refreshed successfully for ${tokenRecord.platform}`);

  } catch (error) {
    console.error(`❌ Token refresh failed for ${tokenRecord.platform}:`, error);
    throw error;
  }
}

// Test scope mismatches for a platform
export async function testPlatformScopes(userId: string, platform: string): Promise<{ hasRequiredScopes: boolean; missingScopes: string[]; errors: string[] }> {
  const requiredScopes = {
    facebook: ['pages_manage_posts', 'instagram_content_publish'],
    youtube: ['https://www.googleapis.com/auth/youtube.upload'],
    linkedin: ['w_member_social'],
    twitter: ['tweet.write']
  };

  const errors: string[] = [];
  const missingScopes: string[] = [];

  try {
    // Get token record
    const [tokenRecord] = await db
      .select()
      .from(oauthTokens)
      .where(and(
        eq(oauthTokens.userId, userId),
        eq(oauthTokens.platform, platform)
      ));

    if (!tokenRecord) {
      errors.push(`No ${platform} connection found`);
      return { hasRequiredScopes: false, missingScopes, errors };
    }

    const userScopes = tokenRecord.scope || [];
    const required = requiredScopes[platform as keyof typeof requiredScopes] || [];

    // Check for missing scopes
    for (const scope of required) {
      if (!userScopes.includes(scope)) {
        missingScopes.push(scope);
      }
    }

    // Test actual API access based on platform
    try {
      switch (platform) {
        case 'facebook':
          await makeAuthenticatedRequest({
            userId,
            platform,
            url: 'https://graph.facebook.com/me/accounts',
            method: 'GET'
          });
          break;
          
        case 'youtube':
          await makeAuthenticatedRequest({
            userId,
            platform,
            url: 'https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true',
            method: 'GET'
          });
          break;
          
        case 'linkedin':
          await makeAuthenticatedRequest({
            userId,
            platform,
            url: 'https://api.linkedin.com/v2/people/~',
            method: 'GET'
          });
          break;
      }
    } catch (apiError: any) {
      if (apiError.message.includes('insufficient permissions') || apiError.message.includes('scope')) {
        errors.push(`Insufficient permissions for ${platform}: ${apiError.message}`);
      }
    }

    return {
      hasRequiredScopes: missingScopes.length === 0 && errors.length === 0,
      missingScopes,
      errors
    };

  } catch (error: any) {
    errors.push(`Scope test failed: ${error.message}`);
    return { hasRequiredScopes: false, missingScopes, errors };
  }
}