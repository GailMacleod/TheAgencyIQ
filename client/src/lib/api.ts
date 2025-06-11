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
    console.error('Error:', text);
    throw new Error('Server error: ' + text.substring(0, 50));
  }

  return response;
}
