import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { sessionManager } from "@/utils/session-manager";
import { apiClient } from "@/utils/api-client";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<any> {
  let response: Response;
  
  try {
    // Reduced timeout for faster loading (5 seconds)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      console.warn('API request timeout for:', method, url);
      controller.abort('API request timeout after 5 seconds');
    }, 5000);

    // Pass AbortController signal to all API client methods
    const requestOptions = { signal: controller.signal };
    
    switch (method.toUpperCase()) {
      case 'GET':
        response = await apiClient.get(url, requestOptions);
        break;
      case 'POST':
        response = await apiClient.post(url, data, requestOptions);
        break;
      case 'PUT':
        response = await apiClient.put(url, data, requestOptions);
        break;
      case 'PATCH':
        response = await apiClient.patch(url, data, requestOptions);
        break;
      case 'DELETE':
        response = await apiClient.delete(url, requestOptions);
        break;
      default:
        throw new Error(`Unsupported HTTP method: ${method}`);
    }
    
    clearTimeout(timeoutId);
    
  } catch (error: any) {
    // Enhanced error handling for AbortController issues
    if (error.name === 'AbortError') {
      const reason = error.message || 'Request was aborted';
      console.error('Request timeout for:', method, url);
      // Return null instead of throwing to allow app to continue
      return null;
    } else if (error.message?.includes('signal is aborted without reason')) {
      console.error('AbortController signal issue for:', method, url);
      // Return null instead of throwing to allow app to continue
      return null;
    } else if (error.message?.includes('Failed to fetch') || error.message?.includes('NetworkError')) {
      console.error('Network error for:', method, url);
      // Return null instead of throwing to allow app to continue
      return null;
    }
    
    // Log unexpected errors for debugging
    console.error('Unexpected API request error:', error, 'for', method, url);
    throw error;
  }
  
  const contentType = response.headers.get('content-type');

  console.log(`API call to ${url} returned ${response.status}`);

  if (!response.ok) {
    const text = await response.text();
    console.error('API Error:', text);
    
    // Handle subscription validation responses
    if (response.status === 401 || response.status === 403) {
      try {
        const errorData = JSON.parse(text);
        if (errorData.requiresSubscription) {
          // Redirect to subscription page for subscription requirement
          window.location.href = '/subscription';
          return;
        }
        if (errorData.requiresLogin) {
          // Redirect to login page for authentication requirement
          window.location.href = '/login';
          return;
        }
      } catch (e) {
        // If not JSON, treat as regular error
      }
    }
    
    throw new Error(`${response.status}: ${text}`);
  }
  
  if (!contentType?.includes('application/json')) {
    const text = await response.text();
    console.error('Non-JSON response:', text);
    throw new Error('Invalid response: ' + text.substring(0, 50));
  }

  return response.json();
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    try {
      // Reduced timeout to prevent hanging requests (10 seconds)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        console.warn('Request timeout for:', queryKey[0]);
        controller.abort('Request timeout after 10 seconds');
      }, 10000);
      
      const res = await apiClient.get(queryKey[0] as string, {
        signal: controller.signal,
        cache: 'no-cache',
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      });

      clearTimeout(timeoutId);

      if (unauthorizedBehavior === "returnNull" && res.status === 401) {
        return null;
      }

      await throwIfResNotOk(res);
      return await res.json();
    } catch (error: any) {
      // Enhanced error handling for AbortController issues
      if (error.name === 'AbortError') {
        // Simply return null for timeout errors instead of throwing
        console.warn('Request timeout for:', queryKey[0], '- returning null');
        return null;
      } else if (error.message?.includes('signal is aborted without reason')) {
        console.warn('AbortController signal issue for:', queryKey[0], '- returning null');
        return null;
      } else if (error.message?.includes('Failed to fetch') || error.message?.includes('NetworkError')) {
        console.warn('Network error for:', queryKey[0], '- returning null');
        return null;
      }
      
      // Log unexpected errors for debugging
      console.error('Unexpected query error:', error);
      throw error;
    }
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "returnNull" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: (failureCount, error: any) => {
        // Don't retry on network errors or timeouts
        if (error?.message?.includes('Network connection failed') || 
            error?.message?.includes('Request timeout') ||
            error?.message?.includes('Failed to fetch')) {
          return false;
        }
        // Only retry up to 2 times for other errors
        return failureCount < 2;
      },
    },
    mutations: {
      retry: false,
    },
  },
});
