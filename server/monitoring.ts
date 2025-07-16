// Sentry monitoring disabled for optimization
// import * as Sentry from '@sentry/node';
// import { nodeProfilingIntegration } from '@sentry/profiling-node';

export function initializeMonitoring() {
  // Sentry monitoring disabled for optimization
  console.log('Monitoring system disabled for optimization');
}

export function logError(error: Error, context?: any) {
  console.error('Error:', error.message, context);
}

export function logInfo(message: string, context?: any) {
  console.log(message, context);
}