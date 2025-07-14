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

    // First check if we already have a valid session using the public endpoint
    try {
      const response = await fetch('/api/auth/session', {
        method: 'GET',
        credentials: 'include'
      });
      
      if (response.ok) {
        const sessionData = await response.json();
        console.log('🔍 Session check result:', sessionData);
        
        if (sessionData.authenticated && sessionData.user) {
          console.log('✅ Existing session verified for:', sessionData.user.email);
          
          this.sessionInfo = {
            id: sessionData.sessionId,
            user: sessionData.user,
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
      const response = await fetch('/api/auth/establish-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        this.sessionInfo = {
          id: data.sessionId || 'established',
          user: data.user,
          established: true
        };
        
        console.log('✅ Session established:', data.user?.email || 'User authenticated');
        console.log('User ID:', data.user?.id);
        console.log('Session ID:', data.sessionId);
        
        // Store in sessionStorage for debugging
        if (data.user) {
          sessionStorage.setItem('currentUser', JSON.stringify({
            id: data.user.id,
            email: data.user.email,
            phone: data.user.phone
          }));
        }
        
        // Log cookie status after session establishment
        console.log('🍪 Cookies after establishment:', document.cookie);
        
        // Test session by making a simple authenticated request
        console.log('🔍 Testing session with /api/user request...');
        const testResponse = await fetch('/api/user', {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Accept': 'application/json',
          }
        });
        
        console.log('🔍 Session verification test:', testResponse.status);
        
        if (testResponse.ok) {
          console.log('✅ Session verification successful');
        } else {
          console.log('❌ Session verification failed');
        }
        
        return this.sessionInfo;
      } else {
        // If session establishment fails, throw error - NO GUEST ACCESS
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
    
    // Always include credentials for automatic cookie transmission
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

  clearSession() {
    this.sessionInfo = null;
    this.sessionPromise = null;
    sessionStorage.removeItem('currentUser');
  }
}

export const sessionManager = new SessionManager();