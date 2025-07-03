// Mock Replit plugins for deployment compatibility
export const runtimeErrorOverlay = () => ({
  name: 'mock-runtime-error-overlay',
  configResolved() {
    // Mock plugin - no implementation needed
  }
});

export const cartographer = () => ({
  name: 'mock-cartographer',
  configResolved() {
    // Mock plugin - no implementation needed
  }
});

export default runtimeErrorOverlay;