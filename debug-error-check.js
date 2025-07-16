import fs from 'fs';
import { pathToRegexp } from 'path-to-regexp';

// Read the routes file
const routesContent = fs.readFileSync('server/routes.ts', 'utf8');

// Find all route definitions
const routeMatches = routesContent.match(/app\.(get|post|put|delete|use)\s*\(\s*['"`]([^'"`]*?)['"`]/g);

console.log('Testing routes for path-to-regexp compatibility:');
routeMatches?.forEach((match, index) => {
  // Extract the path from the match
  const pathMatch = match.match(/['"`]([^'"`]*?)['"`]/);
  if (pathMatch) {
    const path = pathMatch[1];
    
    try {
      // Test the path with path-to-regexp
      const regexp = pathToRegexp(path);
      console.log(`${index + 1}. ✓ ${path}`);
    } catch (error) {
      console.log(`${index + 1}. ✗ ${path} - ERROR: ${error.message}`);
    }
  }
});