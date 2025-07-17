// Simple monitoring system without external dependencies
export function initializeMonitoring() {
  console.log('📊 Monitoring system initialized (development mode)');
}

export function logError(error: Error, context?: any) {
  console.error('❌ Error:', error.message, context);
}

export function logInfo(message: string, context?: any) {
  console.log('ℹ️ Info:', message, context);
}