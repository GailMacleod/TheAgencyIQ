// Microservice URLs configuration
const MICROSERVICE_ENDPOINTS = {
  phoneUpdate: process.env.NODE_ENV === 'production' 
    ? 'https://your-ngrok-url.ngrok.io' 
    : 'http://localhost:3000'
};

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown,
): Promise<Response> {
  console.log(`API call to ${url} starting with method ${method}`);
  
  try {
    // Extended timeout for API requests (30 seconds)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      console.warn('API request timeout for:', method, url);
      controller.abort('API request timeout after 30 seconds');
    }, 30000);

    // Use main app endpoints, not microservice
    const response = await fetch(url, {
      method,
      headers: { 
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: data ? JSON.stringify(data) : undefined,
      credentials: "include",
      signal: controller.signal
    });

    clearTimeout(timeoutId);
    console.log(`API call to ${url} returned ${response.status}`);
    
    return response;
    
  } catch (error: any) {
    // Enhanced error handling for AbortController issues
    if (error.name === 'AbortError') {
      const reason = error.message || 'Request was aborted';
      console.error('AbortError in apiRequest:', reason, 'for', method, url);
      throw new Error(`API request timeout: ${reason}`);
    } else if (error.message?.includes('signal is aborted without reason')) {
      console.error('AbortController signal issue in apiRequest:', error.message, 'for', method, url);
      throw new Error('API request was cancelled due to timeout');
    } else if (error.message?.includes('Failed to fetch') || error.message?.includes('NetworkError')) {
      console.error('Network error in apiRequest:', error.message, 'for', method, url);
      throw new Error('Network connection failed');
    }
    
    // Log unexpected errors for debugging
    console.error('Unexpected API request error:', error, 'for', method, url);
    throw error;
  }

  if (!response.ok) {
    const text = await response.text();
    console.error(`API error:`, text);
    
    // Check if response is HTML (DOCTYPE error)
    if (text.includes('<!DOCTYPE') || text.includes('<html')) {
      throw new Error('Server returned HTML instead of JSON - environment issue detected');
    }
    
    // Try to parse as JSON for proper error handling
    try {
      const errorData = JSON.parse(text);
      throw new Error(errorData.error || errorData.message || 'Server error');
    } catch (parseError) {
      throw new Error('Server error: ' + text.substring(0, 50));
    }
  }

  return response;
}

// Microservice-specific API function
export async function microserviceRequest(
  method: string,
  endpoint: string,
  data?: unknown,
): Promise<Response> {
  console.log(`Microservice call to ${endpoint} with method ${method}`);
  
  const response = await fetch(`${MICROSERVICE_ENDPOINTS.phoneUpdate}${endpoint}`, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
  });

  console.log(`Microservice call to ${endpoint} returned ${response.status}`);

  if (!response.ok) {
    const text = await response.text();
    console.error('Microservice error:', text);
    
    try {
      const errorData = JSON.parse(text);
      throw new Error(errorData.error || errorData.message || 'Microservice error');
    } catch (parseError) {
      throw new Error('Microservice error: ' + text.substring(0, 50));
    }
  }

  return response;
}
