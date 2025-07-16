/**
 * COMPREHENSIVE AUTHENTICATION ROUTE PROTECTION
 * Applies authGuard middleware to all routes that need authentication
 */

const fs = require('fs');
const path = require('path');

const routesPath = path.join(__dirname, 'server/routes.ts');

// Read the current routes file
let routesContent = fs.readFileSync(routesPath, 'utf8');

// First, ensure authGuard is imported
if (!routesContent.includes('import { requireAuth as authGuard }')) {
  const importLine = "import { requireAuth as authGuard } from './middleware/authGuard';";
  const existingImports = routesContent.match(/import.*from.*['"].*authGuard['"];/);
  
  if (!existingImports) {
    // Add the import after the last import statement
    const lastImport = routesContent.lastIndexOf('import ');
    const nextNewline = routesContent.indexOf('\n', lastImport);
    routesContent = routesContent.slice(0, nextNewline) + '\n' + importLine + routesContent.slice(nextNewline);
    console.log('✅ Added authGuard import statement');
  }
}

// Routes that need authentication protection
const routesToProtect = [
  { pattern: /app\.get\(['"]\/api\/user['"],\s*async/, replacement: "app.get('/api/user', authGuard, async" },
  { pattern: /app\.get\(['"]\/api\/platform-connections['"],\s*async/, replacement: "app.get('/api/platform-connections', authGuard, async" },
  { pattern: /app\.post\(['"]\/api\/posts\/create['"],\s*async/, replacement: "app.post('/api/posts/create', authGuard, async" },
  { pattern: /app\.get\(['"]\/api\/subscription-status['"],\s*async/, replacement: "app.get('/api/subscription-status', authGuard, async" },
  { pattern: /app\.get\(['"]\/api\/posts['"],\s*async/, replacement: "app.get('/api/posts', authGuard, async" },
  { pattern: /app\.patch\(['"]\/api\/posts\/:[^'"]*['"],\s*async/, replacement: "app.patch('/api/posts/:id', authGuard, async" },
  { pattern: /app\.delete\(['"]\/api\/posts\/:[^'"]*['"],\s*async/, replacement: "app.delete('/api/posts/:id', authGuard, async" },
];

// Apply authentication protection
let protectedCount = 0;
for (const route of routesToProtect) {
  const matches = routesContent.match(route.pattern);
  if (matches) {
    routesContent = routesContent.replace(route.pattern, route.replacement);
    protectedCount++;
    console.log(`✅ Protected route: ${matches[0]}`);
  } else {
    console.log(`⚠️ Route pattern not found: ${route.pattern.source}`);
  }
}

// Write the updated routes file
fs.writeFileSync(routesPath, routesContent);

console.log(`\n🔒 Authentication protection applied to ${protectedCount} routes`);
console.log('✅ Routes file updated successfully');