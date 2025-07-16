import fs from 'fs';
import path from 'path';

// Read the routes.ts file
const routesPath = 'server/routes.ts';
const content = fs.readFileSync(routesPath, 'utf8');
const lines = content.split('\n');

// Track routes and their line numbers
const routes = new Map();
const duplicateLines = new Set();

// Find all route definitions
lines.forEach((line, index) => {
  if (line.includes('app.') && (line.includes('get(') || line.includes('post(') || line.includes('put(') || line.includes('delete(') || line.includes('patch(') || line.includes('use('))) {
    const routeMatch = line.match(/["']([^"']+)["'].*?\)/);
    if (routeMatch) {
      const route = routeMatch[1];
      const method = line.match(/app\.(\w+)/)[1];
      const key = `${method.toUpperCase()} ${route}`;
      
      if (routes.has(key)) {
        // This is a duplicate - mark for removal
        duplicateLines.add(index);
        console.log(`Duplicate found: ${key} at lines ${routes.get(key)} and ${index + 1}`);
      } else {
        routes.set(key, index + 1);
      }
    }
  }
});

// Create a new file with duplicates removed
const cleanedLines = lines.filter((line, index) => {
  if (duplicateLines.has(index)) {
    // If it's a duplicate route line, replace with a comment
    const routeMatch = line.match(/["']([^"']+)["'].*?\)/);
    if (routeMatch) {
      const route = routeMatch[1];
      const method = line.match(/app\.(\w+)/)[1];
      return `  // DUPLICATE REMOVED: ${method.toUpperCase()} ${route}`;
    }
    return '  // DUPLICATE REMOVED';
  }
  return line;
});

// Write the cleaned file back
fs.writeFileSync(routesPath, cleanedLines.join('\n'), 'utf8');

console.log(`Fixed ${duplicateLines.size} duplicate routes in ${routesPath}`);
console.log('Duplicate routes have been replaced with comments.');