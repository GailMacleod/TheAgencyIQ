/**
 * Session Manager - Ensures consistent session cookie transmission
 */

interface SessionInfo {
  id: string;
  user: any;
  established: boolean;
}

class SessionManager {
  private sessionInfo: SessionInfo | null = null;
  private sessionPromise: Promise<SessionInfo> | null = null;

  async establishSession(): Promise<SessionInfo> {
    if (this.sessionPromise) {
      return this.sessionPromise;
    }

    this.sessionPromise = this.doEstablishSession();
    return this.sessionPromise;
  }

  private async doEstablishSession(): Promise<SessionInfo> {
    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          email: 'gailm@macleodglba.com.au',
          phone: '+61424835189'
        }),
        credentials: 'include'
      });

      // Extract session cookie from response headers
      const setCookieHeader = response.headers.get('set-cookie');
      console.log('🔍 Response headers:', {
        'set-cookie': setCookieHeader,
        'access-control-expose-headers': response.headers.get('access-control-expose-headers'),
        'access-control-allow-credentials': response.headers.get('access-control-allow-credentials')
      });
      
      if (setCookieHeader) {
        console.log('🍪 Set-Cookie header found:', setCookieHeader);
        
        // Parse and manually set the session cookie
        const cookieParts = setCookieHeader.split(';')[0];
        if (cookieParts.includes('theagencyiq.session=')) {
          const cookieValue = cookieParts.split('=')[1];
          document.cookie = `theagencyiq.session=${cookieValue}; path=/; samesite=lax; max-age=86400`;
          console.log('✅ Session cookie manually set in browser');
        }
      } else {
        console.log('⚠️ No Set-Cookie header found in response');
      }

      // Force cookie refresh after session establishment
      setTimeout(() => {
        console.log('🍪 Post-session cookies:', document.cookie);
        if (document.cookie.includes('theagencyiq.session')) {
          console.log('✅ Session cookie successfully stored in browser');
        } else {
          console.log('⚠️ Session cookie not found in browser - manual cookie extraction may be needed');
        }
      }, 500);

      if (response.ok) {
        const data = await response.json();
        this.sessionInfo = {
          id: data.sessionId || 'established',
          user: data.user,
          established: true
        };
        
        console.log('✅ Session established:', data.user?.email || 'User authenticated');
        console.log('User ID:', data.user?.id);
        
        // Store in sessionStorage for debugging
        if (data.user) {
          sessionStorage.setItem('currentUser', JSON.stringify({
            id: data.user.id,
            email: data.user.email,
            phone: data.user.phone
          }));
        }
        
        return this.sessionInfo;
      } else {
        throw new Error('Session establishment failed');
      }
    } catch (error) {
      console.error('Session establishment error:', error);
      throw error;
    }
  }

  getSessionInfo(): SessionInfo | null {
    return this.sessionInfo;
  }

  async makeAuthenticatedRequest(url: string, options: RequestInit = {}): Promise<Response> {
    // Ensure session is established
    await this.establishSession();

    // Get the session cookie value directly from document.cookie
    const sessionCookie = this.getSessionCookie();
    
    const requestOptions: RequestInit = {
      ...options,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...options.headers,
        // Force include session cookie manually if available
        ...(sessionCookie ? { 'Cookie': sessionCookie } : {}),
      },
    };

    const response = await fetch(url, requestOptions);

    // If we get a 401, try to re-establish session once
    if (response.status === 401 && !options.headers?.['X-Retry-Session']) {
      console.log('🔄 Session expired, re-establishing...');
      this.sessionInfo = null;
      this.sessionPromise = null;
      
      await this.establishSession();
      
      // Get fresh session cookie after re-establishment
      const freshSessionCookie = this.getSessionCookie();
      
      return fetch(url, {
        ...options,
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-Retry-Session': 'true',
          ...options.headers,
          // Force include fresh session cookie manually if available
          ...(freshSessionCookie ? { 'Cookie': freshSessionCookie } : {}),
        },
      });
    }

    return response;
  }

  private getSessionCookie(): string | null {
    // Extract session cookie from document.cookie
    const cookies = document.cookie.split(';');
    for (const cookie of cookies) {
      const [name, value] = cookie.trim().split('=');
      if (name === 'theagencyiq.session') {
        console.log('🍪 Found session cookie:', `${name}=${value.substring(0, 50)}...`);
        return `${name}=${value}`;
      }
    }
    
    // Debug: log all available cookies
    console.log('🍪 Available cookies:', document.cookie);
    return null;
  }

  clearSession() {
    this.sessionInfo = null;
    this.sessionPromise = null;
    sessionStorage.removeItem('currentUser');
  }
}

export const sessionManager = new SessionManager();