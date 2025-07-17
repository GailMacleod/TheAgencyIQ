// Conditional Sentry imports to handle missing packages gracefully
let Sentry: any = null;
let nodeProfilingIntegration: any = null;

export function initializeMonitoring() {
  if (process.env.NODE_ENV === 'production') {
    try {
      Sentry = require('@sentry/node');
      const sentryProfiling = require('@sentry/profiling-node');
      nodeProfilingIntegration = sentryProfiling.nodeProfilingIntegration;
      
      Sentry.init({
        dsn: process.env.SENTRY_DSN,
        environment: process.env.NODE_ENV,
        integrations: [
          nodeProfilingIntegration(),
        ],
        tracesSampleRate: 1.0,
        profilesSampleRate: 1.0,
      });
      console.log('✅ Sentry monitoring initialized');
    } catch (error) {
      console.warn('⚠️ Sentry monitoring unavailable:', error.message);
    }
  } else {
    console.log('📝 Development mode - Sentry monitoring disabled');
  }
}

export function logError(error: Error, context?: any) {
  if (process.env.NODE_ENV === 'production' && Sentry) {
    Sentry.captureException(error, { extra: context });
  } else {
    console.error('Error:', error.message, context);
  }
}

export function logInfo(message: string, context?: any) {
  if (process.env.NODE_ENV === 'production' && Sentry) {
    Sentry.addBreadcrumb({
      message,
      data: context,
      level: 'info',
    });
  }
  console.log(message, context);
}