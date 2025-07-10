// Mock plugin for @replit/vite-plugin-cartographer
export default function replitCartographer() {
  return {
    name: 'replit-cartographer-mock',
    configResolved() {
      // Mock implementation - does nothing
    }
  };
}