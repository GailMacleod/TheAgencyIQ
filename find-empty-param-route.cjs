const fs = require('fs');

// Read both files
const indexContent = fs.readFileSync('server/index.ts', 'utf8');
const routesContent = fs.readFileSync('server/routes.ts', 'utf8');

// Function to check for empty parameter patterns
function checkForEmptyParams(content, filename) {
  const lines = content.split('\n');
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Skip if not a route definition
    if (!line.includes('app.') || !/(get|post|put|delete|patch)\s*\(/.test(line)) {
      continue;
    }
    
    // Look for various malformed patterns
    const patterns = [
      /'\/[^']*:'/,        // Empty parameter name: '/api:'
      /'\/[^']*::'/,       // Double colon: '/api::'
      /'\/[^']*:\s*'/,     // Parameter with space: '/api: '
      /'\/[^']*:\//,       // Parameter followed by slash: '/api:/'
    ];
    
    for (const pattern of patterns) {
      if (pattern.test(line)) {
        console.log(`POTENTIAL ISSUE in ${filename} at line ${i + 1}:`);
        console.log(`  ${line.trim()}`);
        
        // Check if it's truly an empty parameter
        const match = line.match(/'([^']*)'/);
        if (match) {
          const route = match[1];
          if (route.includes(':') && !route.match(/:[a-zA-Z_$][a-zA-Z0-9_$]*/)) {
            console.log(`  ❌ CONFIRMED: Empty parameter name in route: ${route}`);
          }
        }
      }
    }
  }
}

console.log('Checking for empty parameter names in routes...');
checkForEmptyParams(indexContent, 'server/index.ts');
checkForEmptyParams(routesContent, 'server/routes.ts');

console.log('Check complete.');