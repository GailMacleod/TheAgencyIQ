// Mock Replit plugins for development compatibility
export function runtimeErrorOverlay() {
  return {
    name: 'mock-runtime-error-overlay',
    configResolved() {
      // Mock plugin - no operation
    }
  };
}

export function cartographer() {
  return {
    name: 'mock-cartographer',
    configResolved() {
      // Mock plugin - no operation
    }
  };
}