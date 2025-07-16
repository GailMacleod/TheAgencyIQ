import fs from 'fs';
import express from 'express';

const app = express();

// Read the routes file
const content = fs.readFileSync('server/routes.ts', 'utf8');
const lines = content.split('\n');

// Test each route pattern individually to find the problematic one
console.log('Testing route patterns individually...');

let routeCount = 0;
let errorRoute = null;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  
  if (line.includes('app.') && (line.includes('get(') || line.includes('post(') || line.includes('put(') || line.includes('delete(') || line.includes('patch(') || line.includes('use('))) {
    const routeMatch = line.match(/["']([^"']+)["'].*?\)/);
    if (routeMatch) {
      const route = routeMatch[1];
      const method = line.match(/app\.(\w+)/)[1];
      
      try {
        // Test if this route pattern would cause path-to-regexp error
        const testApp = express();
        testApp[method](route, (req, res) => {});
        routeCount++;
        
        if (routeCount % 100 === 0) {
          console.log(`Tested ${routeCount} routes successfully...`);
        }
      } catch (error) {
        console.log(`ERROR at line ${i + 1}: ${method.toUpperCase()} ${route}`);
        console.log(`Error: ${error.message}`);
        errorRoute = {
          line: i + 1,
          route: route,
          method: method,
          error: error.message
        };
        break;
      }
    }
  }
}

if (errorRoute) {
  console.log('\\nPROBLEMATIC ROUTE FOUND:');
  console.log(`Line ${errorRoute.line}: ${errorRoute.method.toUpperCase()} ${errorRoute.route}`);
  console.log(`Error: ${errorRoute.error}`);
} else {
  console.log(`\\nAll ${routeCount} routes tested successfully - no obvious path-to-regexp issues found.`);
}