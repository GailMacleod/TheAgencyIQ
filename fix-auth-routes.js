/**
 * COMPREHENSIVE AUTHENTICATION ROUTE PROTECTION
 * Applies authGuard middleware to all routes that need authentication
 */

const fs = require('fs');
const path = require('path');

const routesPath = path.join(__dirname, 'server/routes.ts');

// Read the current routes file
let routesContent = fs.readFileSync(routesPath, 'utf8');

// Routes that need authentication protection
const routesToProtect = [
  { pattern: "app.get('/api/user',", replacement: "app.get('/api/user', authGuard," },
  { pattern: "app.get('/api/platform-connections',", replacement: "app.get('/api/platform-connections', authGuard," },
  { pattern: "app.post('/api/posts/create',", replacement: "app.post('/api/posts/create', authGuard," },
  { pattern: "app.get('/api/subscription-status',", replacement: "app.get('/api/subscription-status', authGuard," },
  { pattern: "app.get('/api/posts',", replacement: "app.get('/api/posts', authGuard," },
  { pattern: "app.post('/api/posts/:id/publish',", replacement: "app.post('/api/posts/:id/publish', authGuard," },
  { pattern: "app.patch('/api/posts/:id',", replacement: "app.patch('/api/posts/:id', authGuard," },
  { pattern: "app.delete('/api/posts/:id',", replacement: "app.delete('/api/posts/:id', authGuard," },
];

// Apply authentication protection
let protectedCount = 0;
for (const route of routesToProtect) {
  const regex = new RegExp(route.pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
  if (routesContent.match(regex)) {
    routesContent = routesContent.replace(regex, route.replacement);
    protectedCount++;
    console.log(`✅ Protected route: ${route.pattern}`);
  } else {
    console.log(`⚠️ Route not found: ${route.pattern}`);
  }
}

// Write the updated routes file
fs.writeFileSync(routesPath, routesContent);

console.log(`\n🔒 Authentication protection applied to ${protectedCount} routes`);
console.log('✅ Routes file updated successfully');