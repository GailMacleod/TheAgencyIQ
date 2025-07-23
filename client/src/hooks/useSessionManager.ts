/**
 * Enhanced Session Manager Hook
 * Provides UI feedback and proper React Query synchronization
 */

import { useState, useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { sessionManager } from '@/utils/session-manager';
import pwaSessionManager from '@/utils/PWASessionManager';

interface SessionState {
  isEstablishing: boolean;
  isError: boolean;
  isReady: boolean;
  error: string | null;
  sessionInfo: any;
}

export function useSessionManager() {
  const [sessionState, setSessionState] = useState<SessionState>({
    isEstablishing: false,
    isError: false,
    isReady: false,
    error: null,
    sessionInfo: null
  });

  const queryClient = useQueryClient();
  const { toast } = useToast();

  /**
   * Establish session with proper UI feedback and React Query sync
   */
  const establishSession = useCallback(async (showToast = false) => {
    if (sessionState.isEstablishing) {
      return sessionState.sessionInfo;
    }

    setSessionState(prev => ({ 
      ...prev, 
      isEstablishing: true, 
      isError: false, 
      error: null 
    }));

    try {
      // Initialize PWA Session Manager first
      await pwaSessionManager.init();
      
      // Establish backend session with timeout
      const sessionPromise = sessionManager.establishSession();
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Session establishment timeout')), 10000)
      );

      const sessionInfo = await Promise.race([sessionPromise, timeoutPromise]) as any;

      setSessionState({
        isEstablishing: false,
        isError: false,
        isReady: true,
        error: null,
        sessionInfo
      });

      // Synchronize React Query after successful session establishment
      await new Promise(resolve => {
        queryClient.invalidateQueries({
          predicate: () => true // Invalidate all queries
        });
        
        // Wait for queries to be invalidated before resolving
        setTimeout(resolve, 150);
      });

      if (showToast && sessionInfo?.user) {
        toast({
          title: "Session Ready",
          description: `Welcome back, ${sessionInfo.user.email}`,
          variant: "default"
        });
      }

      return sessionInfo;

    } catch (error: any) {
      const errorMessage = error.message || 'Session establishment failed';
      
      setSessionState({
        isEstablishing: false,
        isError: true,
        isReady: false,
        error: errorMessage,
        sessionInfo: null
      });

      if (showToast) {
        toast({
          title: "Session Error",
          description: errorMessage,
          variant: "destructive"
        });
      }

      console.error('Session establishment error:', error);
      throw error;
    }
  }, [sessionState.isEstablishing, queryClient, toast]);

  /**
   * Enhanced logout with UI feedback
   */
  const logout = useCallback(async () => {
    setSessionState(prev => ({ ...prev, isEstablishing: true }));

    try {
      await pwaSessionManager.handleLogout();
      
      setSessionState({
        isEstablishing: false,
        isError: false,
        isReady: false,
        error: null,
        sessionInfo: null
      });

      toast({
        title: "Logged Out",
        description: "You've been successfully logged out",
        variant: "default"
      });

    } catch (error: any) {
      console.error('Logout error:', error);
      
      // Force logout even on error
      setSessionState({
        isEstablishing: false,
        isError: true,
        isReady: false,
        error: 'Logout completed with errors',
        sessionInfo: null
      });

      toast({
        title: "Logout Warning",
        description: "Logout completed but some cleanup may have failed",
        variant: "destructive"
      });
    }
  }, [toast]);

  /**
   * Check session status without establishing new one
   */
  const checkSession = useCallback(async () => {
    try {
      const response = await fetch('/api/auth/session', {
        method: 'GET',
        credentials: 'include'
      });

      if (response.ok) {
        const sessionData = await response.json();
        
        setSessionState(prev => ({
          ...prev,
          isReady: sessionData.authenticated,
          sessionInfo: sessionData.authenticated ? sessionData : null
        }));

        return sessionData;
      }
    } catch (error) {
      console.log('Session check failed:', error);
    }

    return null;
  }, []);

  /**
   * Retry session establishment
   */
  const retrySession = useCallback(() => {
    return establishSession(true);
  }, [establishSession]);

  return {
    ...sessionState,
    establishSession,
    logout,
    checkSession,
    retrySession
  };
}