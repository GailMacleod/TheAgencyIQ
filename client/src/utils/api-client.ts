/**
 * API Client with proper credential handling
 */
import { sessionManager } from "./session-manager";

class ApiClient {
  private baseURL: string;

  constructor(baseURL: string = '') {
    this.baseURL = baseURL;
  }

  async makeRequest(url: string, options: RequestInit = {}): Promise<Response> {
    const fullUrl = `${this.baseURL}${url}`;
    
    // Ensure credentials are always included for cookie transmission
    const requestOptions: RequestInit = {
      ...options,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...options.headers
      }
    };
    
    return await fetch(fullUrl, requestOptions);
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