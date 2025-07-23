import { apiRequest } from './queryClient';

export interface AuthenticatedRequestOptions {
  url: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  data?: any;
  userId?: string;
  platform?: string;
  maxRetries?: number;
}

export async function makeAuthenticatedRequest(options: AuthenticatedRequestOptions): Promise<any> {
  const { url, method = 'GET', data, userId, platform, maxRetries = 1 } = options;
  
  let attempts = 0;
  
  while (attempts <= maxRetries) {
    try {
      // Make the API request
      let response;
      if (method === 'GET') {
        response = await apiRequest(url);
      } else {
        response = await fetch(url, {
          method,
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(data)
        });
        
        if (!response.ok) {
          throw new Error(`${response.status}: ${response.statusText}`);
        }
        
        response = await response.json();
      }
      
      return response;
      
    } catch (error: any) {
      attempts++;
      
      // Check if it's a 401 error (token expired)
      if (error.message?.includes('401') && platform && userId && attempts <= maxRetries) {
        console.log(`🔄 Token expired for ${platform}, attempting refresh...`);
        
        try {
          // Attempt to refresh the token
          const refreshResponse = await fetch('/api/refresh', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              platform,
              userId
            })
          });
          
          if (refreshResponse.ok) {
            const refreshData = await refreshResponse.json();
            console.log(`✅ Token refreshed for ${platform}:`, refreshData.message);
            
            // Retry the original request with refreshed token
            continue;
          } else {
            console.error(`❌ Token refresh failed for ${platform}`);
            throw new Error(`Token refresh failed: ${refreshResponse.statusText}`);
          }
          
        } catch (refreshError) {
          console.error('Token refresh error:', refreshError);
          throw new Error(`Authentication failed. Please reconnect your ${platform} account.`);
        }
      } else {
        // Not a 401 error or max retries reached
        throw error;
      }
    }
  }
  
  throw new Error('Max retries exceeded');
}

// Helper function specifically for social media posting with automatic retry
export async function makeAuthenticatedPostingRequest(
  postData: any,
  platform: string,
  userId: string
): Promise<any> {
  return makeAuthenticatedRequest({
    url: '/api/posts/publish-authenticated',
    method: 'POST',
    data: { ...postData, platform },
    userId,
    platform,
    maxRetries: 2 // Allow up to 2 retries for posting
  });
}

// Helper function for OAuth connection testing
export async function testOAuthConnection(platform: string, userId: string): Promise<boolean> {
  try {
    const response = await makeAuthenticatedRequest({
      url: `/api/oauth/test/${platform}`,
      method: 'POST',
      data: { userId },
      userId,
      platform,
      maxRetries: 1
    });
    
    return response.success === true;
  } catch (error) {
    console.error(`OAuth connection test failed for ${platform}:`, error);
    return false;
  }
}