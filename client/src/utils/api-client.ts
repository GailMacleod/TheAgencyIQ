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
    
    // CRITICAL: Use proper credentials for cookie transmission
    const requestOptions: RequestInit = {
      ...options,
      credentials: 'include',  // CRITICAL: Include credentials for cookie transmission
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...options.headers
      }
    };
    
    console.log(`🔧 API Request to ${url} with credentials: include`);
    
    return await fetch(fullUrl, requestOptions);
  }
  
  private getManualCookie(): string | null {
    // First try to get the stored session cookie from sessionStorage
    const storedCookie = sessionStorage.getItem('sessionCookie');
    if (storedCookie) {
      return storedCookie;
    }
    
    // Get session ID from sessionStorage (set by session manager)
    const sessionId = sessionStorage.getItem('sessionId');
    if (sessionId) {
      return `theagencyiq.session=${sessionId}`;
    }
    
    // Fallback to extracting from document.cookie
    const cookies = document.cookie.split(';');
    for (const cookie of cookies) {
      const trimmed = cookie.trim();
      // Prefer signed cookies (s%3A format)
      if (trimmed.startsWith('theagencyiq.session=s%3A')) {
        return trimmed;
      }
    }
    
    // Try the unsigned cookie for browser compatibility
    for (const cookie of cookies) {
      const trimmed = cookie.trim();
      if (trimmed.startsWith('theagencyiq.session.unsigned=')) {
        // Convert unsigned cookie to signed format for consistent transmission
        const sessionId = trimmed.split('=')[1];
        return `theagencyiq.session=${sessionId}`;
      }
    }
    
    // If no unsigned cookie either, try any session cookie
    for (const cookie of cookies) {
      const trimmed = cookie.trim();
      if (trimmed.startsWith('theagencyiq.session=')) {
        return trimmed;
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