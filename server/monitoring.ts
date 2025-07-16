export function initializeMonitoring() {
  // Monitoring simplified for development - can be enhanced later
  console.log('✅ Monitoring initialized');
}

export function logError(error: Error, context?: any) {
  console.error('Error:', error.message, context);
}

export function logInfo(message: string, context?: any) {
  console.log(message, context);
}