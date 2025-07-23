import { toast } from "@/hooks/use-toast";

interface RequestOptions {
  method?: string;
  headers?: Record<string, string>;
  body?: any;
  timeout?: number;
  maxRetries?: number;
}

interface RetryConfig {
  attempt: number;
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
}

// Exponential backoff with jitter
function calculateDelay(config: RetryConfig): number {
  const exponentialDelay = Math.min(
    config.baseDelay * Math.pow(2, config.attempt - 1),
    config.maxDelay
  );
  
  // Add jitter (±20%)
  const jitter = exponentialDelay * 0.2 * (Math.random() - 0.5);
  return Math.floor(exponentialDelay + jitter);
}

// Sleep utility
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function makeAuthenticatedRequest(
  url: string, 
  options: RequestOptions = {}
): Promise<Response> {
  const {
    method = 'GET',
    headers = {},
    body,
    timeout = 8000,
    maxRetries = 3
  } = options;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  const requestConfig: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
      ...headers
    },
    credentials: 'include', // Include cookies for session
    signal: controller.signal
  };

  if (body && method !== 'GET') {
    requestConfig.body = typeof body === 'string' ? body : JSON.stringify(body);
  }

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🔄 Request attempt ${attempt}/${maxRetries}: ${method} ${url}`);
      
      const response = await fetch(url, requestConfig);
      clearTimeout(timeoutId);

      // Handle 401 - Session expired
      if (response.status === 401) {
        console.log('🔐 Session expired, attempting session refresh...');
        
        // Try to establish a new session
        try {
          const sessionResponse = await fetch('/api/auth/session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include'
          });

          if (sessionResponse.ok) {
            console.log('✅ Session refreshed, retrying original request...');
            // Retry original request with refreshed session
            const retryResponse = await fetch(url, requestConfig);
            
            if (retryResponse.ok) {
              return retryResponse;
            }
          }
        } catch (sessionError) {
          console.error('❌ Session refresh failed:', sessionError);
        }

        // Session refresh failed, redirect to login
        toast({
          title: "Session Expired",
          description: "Please log in again to continue",
          variant: "destructive",
        });
        
        // Redirect to login after short delay
        setTimeout(() => {
          window.location.href = '/api/login';
        }, 1500);
        
        throw new Error('Session expired and refresh failed');
      }

      // Handle other 4xx errors (don't retry)
      if (response.status >= 400 && response.status < 500 && response.status !== 401) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      // Handle 5xx errors (retry these)
      if (response.status >= 500) {
        throw new Error(`Server error: HTTP ${response.status}`);
      }

      // Success
      console.log(`✅ Request successful: ${method} ${url}`);
      return response;

    } catch (error) {
      lastError = error as Error;
      console.error(`❌ Request attempt ${attempt} failed:`, error);

      // Don't retry on abort/timeout for last attempt
      if (attempt === maxRetries) {
        clearTimeout(timeoutId);
        break;
      }

      // Don't retry on client errors (except 401)
      if (error instanceof Error && error.message.includes('HTTP 4')) {
        clearTimeout(timeoutId);
        break;
      }

      // Calculate delay for next attempt
      const delay = calculateDelay({
        attempt,
        maxRetries,
        baseDelay: 1000, // Start with 1 second
        maxDelay: 10000  // Max 10 seconds
      });

      console.log(`⏱️ Waiting ${delay}ms before retry...`);
      await sleep(delay);
    }
  }

  clearTimeout(timeoutId);

  // All retries failed
  console.error(`💥 All ${maxRetries} attempts failed for ${method} ${url}`);
  
  // Show user-friendly error toast
  if (lastError?.name === 'AbortError') {
    toast({
      title: "Request Timeout",
      description: "The request took too long. Please check your connection and try again.",
      variant: "destructive",
    });
  } else if (lastError?.message.includes('Session expired')) {
    // Already handled above
  } else {
    toast({
      title: "Connection Error",
      description: "Unable to connect to the server. Please try again.",
      variant: "destructive",
    });
  }

  throw lastError || new Error(`Request failed after ${maxRetries} attempts`);
}

// Convenience method for session establishment
export async function establishSession(userId: string, userEmail?: string): Promise<boolean> {
  try {
    console.log('🔐 Establishing session...');
    
    const response = await makeAuthenticatedRequest('/api/establish-session', {
      method: 'POST',
      body: {
        userId,
        userEmail,
        deviceInfo: {
          userAgent: navigator.userAgent,
          timestamp: Date.now(),
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
        }
      },
      maxRetries: 2,
      timeout: 10000
    });

    if (response.ok) {
      const data = await response.json();
      console.log('✅ Session established:', data.sessionId);
      
      toast({
        title: "Session Established",
        description: "You're now logged in successfully",
      });
      
      return true;
    }

    return false;
  } catch (error) {
    console.error('❌ Session establishment failed:', error);
    return false;
  }
}

// Validate current session
export async function validateSession(): Promise<boolean> {
  try {
    const response = await makeAuthenticatedRequest('/api/auth/session', {
      method: 'GET',
      maxRetries: 1,
      timeout: 5000
    });

    return response.ok;
  } catch (error) {
    console.error('Session validation failed:', error);
    return false;
  }
}