/**
 * API Client with proper credential handling
 */

class ApiClient {
  private baseURL: string;

  constructor(baseURL: string = '') {
    this.baseURL = baseURL;
  }

  async makeRequest(url: string, options: RequestInit = {}): Promise<Response> {
    const fullUrl = `${this.baseURL}${url}`;
    
    // Extract session cookie manually
    const sessionCookie = this.getSessionCookie();
    
    const defaultOptions: RequestInit = {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...options.headers,
        // Force include session cookie manually if available
        ...(sessionCookie ? { 'Cookie': sessionCookie } : {}),
      },
    };

    const requestOptions = {
      ...defaultOptions,
      ...options,
      headers: {
        ...defaultOptions.headers,
        ...options.headers,
        // Ensure session cookie is included
        ...(sessionCookie ? { 'Cookie': sessionCookie } : {}),
      },
    };

    console.log(`🌐 API Request: ${options.method || 'GET'} ${fullUrl}`);
    console.log(`🍪 Request credentials: ${requestOptions.credentials}`);
    if (sessionCookie) {
      console.log(`🍪 Manual cookie: ${sessionCookie.substring(0, 50)}...`);
    }

    const response = await fetch(fullUrl, requestOptions);
    
    console.log(`📡 Response: ${response.status} ${response.statusText}`);
    
    return response;
  }

  private getSessionCookie(): string | null {
    // Extract session cookie from document.cookie
    const cookies = document.cookie.split(';');
    for (const cookie of cookies) {
      const [name, value] = cookie.trim().split('=');
      if (name === 'theagencyiq.session') {
        return `${name}=${value}`;
      }
    }
    return null;
  }

  async get(url: string, options: RequestInit = {}): Promise<Response> {
    return this.makeRequest(url, { ...options, method: 'GET' });
  }

  async post(url: string, data?: any, options: RequestInit = {}): Promise<Response> {
    return this.makeRequest(url, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put(url: string, data?: any, options: RequestInit = {}): Promise<Response> {
    return this.makeRequest(url, {
      ...options,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async patch(url: string, data?: any, options: RequestInit = {}): Promise<Response> {
    return this.makeRequest(url, {
      ...options,
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete(url: string, options: RequestInit = {}): Promise<Response> {
    return this.makeRequest(url, { ...options, method: 'DELETE' });
  }
}

export const apiClient = new ApiClient();