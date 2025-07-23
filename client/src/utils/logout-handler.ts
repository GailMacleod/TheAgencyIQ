/**
 * Enhanced logout handler with race condition prevention
 * Ensures proper async handling and comprehensive cleanup
 */

interface LogoutOptions {
  redirectToLogin?: boolean;
  clearLocalStorage?: boolean;
  revokeOAuthTokens?: boolean;
  timeout?: number;
}

class LogoutHandler {
  private isLoggingOut = false;
  private abortController: AbortController | null = null;

  async performLogout(options: LogoutOptions = {}): Promise<void> {
    // Prevent concurrent logout attempts
    if (this.isLoggingOut) {
      console.warn('Logout already in progress, skipping duplicate request');
      return;
    }

    this.isLoggingOut = true;
    this.abortController = new AbortController();

    const {
      redirectToLogin = true,
      clearLocalStorage = true,
      revokeOAuthTokens = true,
      timeout = 10000
    } = options;

    try {
      // Set timeout for logout operation
      const timeoutId = setTimeout(() => {
        this.abortController?.abort();
      }, timeout);

      // Step 1: Clear local storage immediately to prevent state issues
      if (clearLocalStorage) {
        this.clearClientStorage();
      }

      // Step 2: Revoke OAuth tokens if requested
      if (revokeOAuthTokens) {
        await this.revokeOAuthTokens();
      }

      // Step 3: Call server logout endpoint
      await this.callServerLogout();

      // Step 4: Clear any remaining client state
      await this.clearPWASession();

      clearTimeout(timeoutId);

      // Step 5: Redirect to login if requested
      if (redirectToLogin) {
        window.location.href = '/api/login';
      }

    } catch (error) {
      console.error('Logout process encountered an error:', error);
      
      // Even if logout fails, clear client state for security
      this.clearClientStorage();
      
      // Report error to Sentry if available
      if (window.Sentry?.captureException) {
        window.Sentry.captureException(error, {
          tags: { component: 'logout_handler' },
          extra: { options }
        });
      }

      // Still redirect on error to ensure user is logged out
      if (redirectToLogin) {
        window.location.href = '/api/login';
      }
    } finally {
      this.isLoggingOut = false;
      this.abortController = null;
    }
  }

  private clearClientStorage(): void {
    try {
      // Clear localStorage
      localStorage.clear();
      
      // Clear sessionStorage
      sessionStorage.clear();
      
      // Clear any PWA-specific storage
      if ('caches' in window) {
        caches.keys().then(names => {
          names.forEach(name => caches.delete(name));
        }).catch(error => {
          console.warn('Failed to clear cache storage:', error);
        });
      }

      console.log('Client storage cleared successfully');
    } catch (error) {
      console.error('Failed to clear client storage:', error);
    }
  }

  private async revokeOAuthTokens(): Promise<void> {
    try {
      const response = await fetch('/api/oauth-revoke', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: this.abortController?.signal,
      });

      if (!response.ok) {
        throw new Error(`OAuth revocation failed: ${response.status}`);
      }

      console.log('OAuth tokens revoked successfully');
    } catch (error) {
      if (error.name === 'AbortError') {
        console.warn('OAuth revocation timeout');
      } else {
        console.error('Failed to revoke OAuth tokens:', error);
      }
      // Don't throw - continue with logout process
    }
  }

  private async callServerLogout(): Promise<void> {
    try {
      const response = await fetch('/api/logout', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
        },
        signal: this.abortController?.signal,
      });

      if (!response.ok) {
        throw new Error(`Server logout failed: ${response.status}`);
      }

      console.log('Server logout completed successfully');
    } catch (error) {
      if (error.name === 'AbortError') {
        console.warn('Server logout timeout');
      } else {
        console.error('Server logout failed:', error);
      }
      // Don't throw - continue with logout process
    }
  }

  private async clearPWASession(): Promise<void> {
    try {
      // Signal PWA to clear session
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'CLEAR_SESSION',
          timestamp: Date.now()
        });
      }

      // Clear IndexedDB if used for session storage
      if ('indexedDB' in window) {
        // This is a generic cleanup - specific implementations may vary
        const deletePromises = ['theagencyiq_session', 'pwa_cache'].map(dbName => {
          return new Promise<void>((resolve) => {
            const deleteReq = indexedDB.deleteDatabase(dbName);
            deleteReq.onsuccess = () => resolve();
            deleteReq.onerror = () => resolve(); // Don't fail on error
          });
        });

        await Promise.allSettled(deletePromises);
      }

      console.log('PWA session cleared successfully');
    } catch (error) {
      console.warn('Failed to clear PWA session:', error);
      // Don't throw - this is non-critical
    }
  }

  // Public method to check if logout is in progress
  get isInProgress(): boolean {
    return this.isLoggingOut;
  }

  // Public method to abort ongoing logout
  abortLogout(): void {
    if (this.abortController) {
      this.abortController.abort();
      this.isLoggingOut = false;
      console.log('Logout operation aborted');
    }
  }
}

// Export singleton instance
export const logoutHandler = new LogoutHandler();

// Export convenient function for common use case
export async function performSecureLogout(options?: LogoutOptions): Promise<void> {
  return logoutHandler.performLogout(options);
}