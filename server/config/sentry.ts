/**
 * Sentry Error Logging Configuration
 * Production-ready error tracking and performance monitoring
 */

import * as Sentry from '@sentry/node';
import { ProfilingIntegration } from '@sentry/profiling-node';
import { Express } from 'express';

// Environment-specific configuration
const isProduction = process.env.NODE_ENV === 'production';
const SENTRY_DSN = process.env.SENTRY_DSN;

/**
 * Initialize Sentry for error tracking
 */
export function initializeSentry(): void {
  if (!SENTRY_DSN) {
    console.log('⚠️ Sentry DSN not configured - error tracking disabled');
    return;
  }

  try {
    Sentry.init({
      dsn: SENTRY_DSN,
      environment: process.env.NODE_ENV || 'development',
      
      // Performance monitoring
      tracesSampleRate: isProduction ? 0.1 : 1.0, // 10% in prod, 100% in dev
      
      // Profiling
      profilesSampleRate: isProduction ? 0.1 : 1.0,
      integrations: [
        new ProfilingIntegration()
      ],
      
      // Release tracking
      release: process.env.npm_package_version || '1.0.0',
      
      // Filter sensitive data
      beforeSend(event) {
        // Remove sensitive data from error reports
        if (event.request?.headers) {
          delete event.request.headers['authorization'];
          delete event.request.headers['cookie'];
          delete event.request.headers['x-api-key'];
        }
        
        // Filter out development noise
        if (!isProduction && event.exception) {
          const error = event.exception.values?.[0];
          if (error?.value?.includes('ECONNREFUSED') || 
              error?.value?.includes('fetch failed')) {
            return null; // Don't send connection errors in development
          }
        }
        
        return event;
      },
      
      // Custom tags
      initialScope: {
        tags: {
          component: 'theagencyiq-server',
          platform: 'replit'
        }
      }
    });

    console.log('✅ Sentry error tracking initialized');
  } catch (error) {
    console.error('❌ Sentry initialization failed:', error);
  }
}

/**
 * Configure Sentry middleware for Express
 */
export function configureSentryMiddleware(app: Express): void {
  if (!SENTRY_DSN) return;

  // Request handler must be the first middleware
  app.use(Sentry.Handlers.requestHandler({
    ip: false, // Don't capture IP addresses
    user: ['id', 'email'] // Capture user context
  }));

  // Tracing handler for performance monitoring
  app.use(Sentry.Handlers.tracingHandler());

  console.log('✅ Sentry middleware configured');
}

/**
 * Configure Sentry error handler (must be after all routes)
 */
export function configureSentryErrorHandler(app: Express): void {
  if (!SENTRY_DSN) return;

  app.use(Sentry.Handlers.errorHandler({
    shouldHandleError(error) {
      // Only send 500+ errors to Sentry
      return error.status === undefined || error.status >= 500;
    }
  }));

  console.log('✅ Sentry error handler configured');
}

/**
 * Log custom errors to Sentry
 */
export function logError(error: Error, context?: Record<string, any>): void {
  if (SENTRY_DSN) {
    Sentry.withScope(scope => {
      if (context) {
        Object.entries(context).forEach(([key, value]) => {
          scope.setContext(key, value);
        });
      }
      
      scope.setTag('source', 'manual');
      Sentry.captureException(error);
    });
  }
  
  // Always log to console as well
  console.error('❌ Error:', error.message, context || '');
}

/**
 * Log custom messages to Sentry
 */
export function logMessage(message: string, level: 'info' | 'warning' | 'error' = 'info', context?: Record<string, any>): void {
  if (SENTRY_DSN) {
    Sentry.withScope(scope => {
      if (context) {
        Object.entries(context).forEach(([key, value]) => {
          scope.setContext(key, value);
        });
      }
      
      scope.setTag('source', 'manual');
      Sentry.captureMessage(message, level);
    });
  }
  
  // Always log to console
  console.log(`📝 ${level.toUpperCase()}: ${message}`, context || '');
}

/**
 * Add user context to Sentry scope
 */
export function setSentryUser(userId: string, email?: string): void {
  if (SENTRY_DSN) {
    Sentry.setUser({
      id: userId,
      email: email
    });
  }
}

/**
 * Clear Sentry user context
 */
export function clearSentryUser(): void {
  if (SENTRY_DSN) {
    Sentry.setUser(null);
  }
}

export { Sentry };