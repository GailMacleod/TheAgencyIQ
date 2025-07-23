// Debug path matching logic
const testPaths = [
  '/api/onboarding/validate',
  '/api/onboarding/send-phone-otp', 
  '/api/verify-email',
  '/api/onboarding/complete'
];

console.log('Testing path matching logic:');
testPaths.forEach(path => {
  const publicRoute = path === '/health' || 
                     path === '/manifest.json' ||
                     path.startsWith('/public/js/') ||
                     path.startsWith('/attached_assets/') ||
                     path.startsWith('/api/onboarding/') ||
                     path === '/api/verify-email';
  
  console.log(`Path: ${path} -> Public: ${publicRoute}`);
});

// Test subscription middleware paths
const publicPaths = [
  '/api/subscription-plans',
  '/api/auth/',
  '/webhook',
  '/api/webhook',
  '/manifest.json',
  '/',
  '/subscription',
  '/public',
  '/api/onboarding/',
  '/api/verify-email'
];

console.log('\nTesting subscription middleware paths:');
testPaths.forEach(path => {
  const isPublic = publicPaths.some(publicPath => path === publicPath || path.startsWith(publicPath));
  console.log(`Path: ${path} -> Is Public in subscription: ${isPublic}`);
});
