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
  
  // Use main app endpoints, not microservice
  const response = await fetch(url, {
    method,
    headers: { 
      "Content-Type": "application/json",
      "Accept": "application/json"
    },
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include"
  });

  console.log(`API call to ${url} returned ${response.status}`);

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
