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

    // First check if we already have a valid session using the user endpoint
    try {
      const response = await fetch('/api/user', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const user = await response.json();
        console.log('🔍 Session check result:', { authenticated: true, user });
        
        if (user && user.email) {
          console.log('✅ Existing session verified for:', user.email);
          
          this.sessionInfo = {
            id: 'existing',
            user: user,
            established: true
          };
          
          return this.sessionInfo;
        }
      }
    } catch (error) {
      console.log('⚠️ Session verification failed, creating new session');
    }

    this.sessionPromise = this.doEstablishSession();
    return this.sessionPromise;
  }

  private async doEstablishSession(): Promise<SessionInfo> {
    try {
      console.log('🔍 Establishing session...');
      
      const response = await fetch('/api/establish-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          email: 'gailm@macleodglba.com.au',
          phone: '+61424835189'
        })
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Session establishment response:', data);
        
        // Extract session ID from response
        const sessionId = data.sessionId;
        if (sessionId) {
          console.log('📋 Session ID received:', sessionId);
          console.log('🔧 Session will be handled automatically by browser cookies');
        }
        
        this.sessionInfo = {
          id: sessionId || 'established',
          user: data.user,
          established: true
        };
        
        console.log('✅ Session established:', data.user?.email || 'User authenticated');
        console.log('User ID:', data.user?.id);
        console.log('Session ID:', sessionId);
        
        // Store user info
        if (data.user) {
          sessionStorage.setItem('currentUser', JSON.stringify({
            id: data.user.id,
            email: data.user.email,
            phone: data.user.phone
          }));
        }
        
        // Add a delay to ensure cookie is set by the browser before returning
        await new Promise(resolve => setTimeout(resolve, 500));
        
        return this.sessionInfo;
      } else {
        console.error('Session establishment failed with status:', response.status);
        const errorData = await response.json();
        throw new Error(errorData.message || 'Session establishment failed');
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
    console.log(`🔍 Making authenticated request to: ${url}`);
    
    // Use browser's built-in cookie mechanism - no manual cookie headers needed
    const requestOptions: RequestInit = {
      ...options,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...options.headers,
      },
    };

    const response = await fetch(url, requestOptions);

    // If we get a 401, try to re-establish session once
    if (response.status === 401 && !options.headers?.['X-Retry-Session']) {
      console.log('🔄 Session expired, re-establishing...');
      this.sessionInfo = null;
      this.sessionPromise = null;
      
      await this.establishSession();
      
      return fetch(url, {
        ...requestOptions,
        headers: {
          ...requestOptions.headers,
          'X-Retry-Session': 'true',
        },
      });
    }

    return response;
  }

  private getSessionCookie(): string | null {
    // First try to get session cookie from sessionStorage (manual handling)
    const sessionCookie = sessionStorage.getItem('sessionCookie');
    if (sessionCookie) {
      console.log('🔑 Using stored session cookie:', sessionCookie.substring(0, 50) + '...');
      return sessionCookie;
    }
    
    // Fallback: Extract session cookie from document.cookie
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
    console.log('🔑 Session ID in storage:', sessionStorage.getItem('sessionId'));
    return null;
  }

  clearSession() {
    this.sessionInfo = null;
    this.sessionPromise = null;
    sessionStorage.removeItem('sessionId');
    sessionStorage.removeItem('sessionCookie');
    sessionStorage.removeItem('currentUser');
    
    // Clear all session-related cookies
    document.cookie = 'theagencyiq.session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    document.cookie = 'theagencyiq.session.unsigned=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    
    // Clear localStorage session data
    localStorage.removeItem('aiq_session_cookie');
    localStorage.removeItem('aiq_session_cookie_unsigned');
  }
  
  /**
   * Generate a mock signature for session cookies (development only)
   */
  private generateSignature(sessionId: string): string {
    // Simple hash for development - matches server-side signing
    let hash = 0;
    for (let i = 0; i < sessionId.length; i++) {
      const char = sessionId.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }
}

export const sessionManager = new SessionManager();