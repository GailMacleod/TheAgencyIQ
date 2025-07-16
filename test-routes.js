import express from 'express';
const app = express();

// Test routes to find the problematic one
const testRoutes = [
  '/api/health',
  '/api/establish-session',
  '/api/analytics/track',
  '/api/schedule',
  '/api/connect/:platform',
  '/api/deletion-status/:userId',
  '/api/posts/:id/publish',
  '/api/posts/:postId/platform-id',
  '/api/posts/validate-platform-id/:postId',
  '/api/quota-status/:userId',
  '/api/posts/:id/platform-id',
  '/api/posts/validate-platform-id/:id',
  '/api/oauth/refresh/:platform',
  '/api/platform-analytics/:platform',
  '/api/ai/learning-insights/:userId',
  '/api/ai/optimal-timing/:platform',
  '/api/analytics/post-performance/:postId',
  '/api/posts/validate-platform-id/:postId',
  '/api/posts/:postId/platform-id',
];

console.log('Testing routes for path regex issues...');

for (const route of testRoutes) {
  try {
    app.get(route, (req, res) => {
      res.json({ route });
    });
    console.log(`✅ Route OK: ${route}`);
  } catch (error) {
    console.error(`❌ Route ERROR: ${route} - ${error.message}`);
  }
}

console.log('Route testing completed');