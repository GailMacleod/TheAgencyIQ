export async function apiRequest(
  method: string,
  url: string,
  data?: unknown,
): Promise<Response> {
  console.log(`API call to ${url} starting with method ${method}`);
  
  const response = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  console.log(`API call to ${url} returned ${response.status}`);

  if (!response.ok) {
    const text = await response.text();
    console.error('Non-JSON response:', text);
    
    // Check if response is HTML (DOCTYPE error)
    if (text.includes('<!DOCTYPE') || text.includes('<html')) {
      throw new Error('Server returned HTML instead of JSON. Check server configuration.');
    }
    
    // Try to parse as JSON for proper error handling
    try {
      const errorData = JSON.parse(text);
      throw new Error(errorData.error || errorData.message || 'Server error');
    } catch (parseError) {
      throw new Error('Server error: ' + text.substring(0, 100));
    }
  }

  return response;
}
