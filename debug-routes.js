import fs from 'fs';

// Read the routes file
const routesContent = fs.readFileSync('server/routes.ts', 'utf8');

// Find all route definitions
const routeMatches = routesContent.match(/app\.(get|post|put|delete)\s*\(\s*['"`]([^'"`]*?)['"`]/g);

console.log('Found route definitions:');
routeMatches?.forEach((match, index) => {
  // Extract the path from the match
  const pathMatch = match.match(/['"`]([^'"`]*?)['"`]/);
  if (pathMatch) {
    const path = pathMatch[1];
    console.log(`${index + 1}. ${path}`);
    
    // Check for problematic characters
    if (path.includes('?')) {
      console.log(`   ⚠️  WARNING: Route path contains question mark: ${path}`);
    }
    if (path.includes('*')) {
      console.log(`   ⚠️  WARNING: Route path contains asterisk: ${path}`);
    }
  }
});