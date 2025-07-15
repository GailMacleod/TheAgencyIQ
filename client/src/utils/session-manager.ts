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
        
        // Extract session ID from response headers
        const setCookieHeader = response.headers.get('Set-Cookie');
        let extractedSessionId = data.sessionId;
        
        if (setCookieHeader) {
          // Extract session ID from Set-Cookie header (both signed and unsigned)
          const sessionMatch = setCookieHeader.match(/theagencyiq\.session=([^;]+)/);
          const unsignedMatch = setCookieHeader.match(/theagencyiq\.session\.unsigned=([^;]+)/);
          
          if (sessionMatch) {
            extractedSessionId = sessionMatch[1];
            // Store the session cookie for browser use in signed format
            document.cookie = `theagencyiq.session=${extractedSessionId}; path=/; max-age=86400; SameSite=Lax`;
          }
          
          if (unsignedMatch) {
            const unsignedSessionId = unsignedMatch[1];
            // Store the unsigned session cookie for browser use
            document.cookie = `theagencyiq.session.unsigned=${unsignedSessionId}; path=/; max-age=86400; SameSite=Lax`;
          }
        }
        
        this.sessionInfo = {
          id: extractedSessionId || 'established',
          user: data.user,
          established: true
        };
        
        console.log('✅ Session established:', data.user?.email || 'User authenticated');
        console.log('User ID:', data.user?.id);
        console.log('Session ID:', extractedSessionId);
        
        // Store session ID in sessionStorage for manual cookie handling
        if (extractedSessionId) {
          sessionStorage.setItem('sessionId', extractedSessionId);
        }
        
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
    
    // Check if we have either signed or unsigned cookie
    const hasSignedCookie = document.cookie.includes('theagencyiq.session=');
    const hasUnsignedCookie = document.cookie.includes('theagencyiq.session.unsigned=');
    console.log('🔍 Cookie status:', { hasSignedCookie, hasUnsignedCookie });
        
        // Test session by making a simple authenticated request
        console.log('🔍 Testing session with /api/user request...');
        const testResponse = await fetch('/api/user', {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          }
        });
        
        console.log('🔍 Session verification test:', testResponse.status);
        
        if (testResponse.ok) {
          console.log('✅ Session verification successful');
        } else {
          console.log('❌ Session verification failed');
          // Try to manually establish cookie with signed cookie format
          console.log('🔧 Attempting manual cookie establishment...');
          
          // Force cookie setting in browser using both signed and unsigned formats
          if (setCookieHeader) {
            // Extract the signed session cookie from Set-Cookie header
            const cookieMatch = setCookieHeader.match(/theagencyiq\.session=([^;]+)/);
            const unsignedMatch = setCookieHeader.match(/theagencyiq\.session\.unsigned=([^;]+)/);
            
            if (cookieMatch) {
              const sessionId = cookieMatch[1];
              console.log('🔧 Setting signed session cookie:', sessionId);
              document.cookie = `theagencyiq.session=${sessionId}; path=/; max-age=86400; SameSite=Lax`;
              
              // Store the session cookie value for manual transmission
              localStorage.setItem('aiq_session_cookie', `theagencyiq.session=${sessionId}`);
            }
            
            if (unsignedMatch) {
              const unsignedSessionId = unsignedMatch[1];
              console.log('🔧 Setting unsigned session cookie:', unsignedSessionId);
              document.cookie = `theagencyiq.session.unsigned=${unsignedSessionId}; path=/; max-age=86400; SameSite=Lax`;
              
              // Store the unsigned session cookie value for manual transmission
              localStorage.setItem('aiq_session_cookie_unsigned', `theagencyiq.session.unsigned=${unsignedSessionId}`);
            }
          }
          
          // Retry test
          const retryResponse = await fetch('/api/user', {
            method: 'GET',
            credentials: 'include',
            headers: {
              'Accept': 'application/json'
            }
          });
          
          console.log('🔍 Retry test after manual cookie:', retryResponse.status);
          
          if (retryResponse.ok) {
            console.log('✅ Manual cookie setting successful');
          } else {
            console.log('❌ Manual cookie setting failed');
          }
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
    
    // Extract session cookie from document.cookie if available
    const sessionCookie = this.getSessionCookie();
    
    // Always include credentials for automatic cookie transmission + manual cookie header
    const requestOptions: RequestInit = {
      ...options,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...(sessionCookie ? { 'Cookie': sessionCookie } : {}),
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
    // First try to get session ID from sessionStorage (manual handling)
    const sessionId = sessionStorage.getItem('sessionId');
    if (sessionId) {
      console.log('🔑 Using stored session ID:', sessionId.substring(0, 50) + '...');
      return `theagencyiq.session=${sessionId}`;
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
    console.log('🔑 Session ID in storage:', sessionId);
    return null;
  }

  clearSession() {
    this.sessionInfo = null;
    this.sessionPromise = null;
    sessionStorage.removeItem('currentUser');
  }
}

export const sessionManager = new SessionManager();