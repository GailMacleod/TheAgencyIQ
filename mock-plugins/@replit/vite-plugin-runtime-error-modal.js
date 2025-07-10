// Mock plugin for @replit/vite-plugin-runtime-error-modal  
export default function replitRuntimeErrorModal() {
  return {
    name: 'replit-runtime-error-modal-mock',
    configResolved() {
      // Mock implementation - does nothing
    }
  };
}