// Temporary mock plugin for production deployment
export default function mockPlugin() {
  return {
    name: 'mock-plugin',
    configResolved() {}
  };
}

export const cartographer = () => ({
  name: 'mock-cartographer',
  configResolved() {}
});