#!/usr/bin/env node

/**
 * SIMPLE REACT FIX - MOVE REACT ASSIGNMENT TO BEGINNING
 * This script simply moves the React assignment to the very beginning of the bundle
 */

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

console.log('🔧 Simple React fix - moving React assignment to beginning...');

try {
  // Read the working bundle
  const bundlePath = join(process.cwd(), 'dist/main.js');
  let bundleContent = readFileSync(bundlePath, 'utf-8');

  // Find the React assignment and the variable it references
  const reactAssignMatch = bundleContent.match(/var ([A-Za-z0-9_]+)=B\(P\(\),1\);window\.React=\1\.default;/);
  
  if (reactAssignMatch) {
    const reactVar = reactAssignMatch[1]; // e.g., 'zM'
    const fullMatch = reactAssignMatch[0]; // Full match
    
    console.log(`Found React assignment: ${fullMatch}`);
    
    // Remove the original React assignment from its current location
    bundleContent = bundleContent.replace(fullMatch, `var ${reactVar}=B(P(),1);`);
    
    // Add React assignment at the very beginning of the bundle
    const fixedBundle = `var ${reactVar}=B(P(),1);window.React=${reactVar}.default;globalThis.React=${reactVar}.default;console.log('React available immediately');
${bundleContent}`;
    
    // Write the fixed bundle
    writeFileSync(bundlePath, fixedBundle);
    
    console.log('✅ React assignment moved to beginning');
    console.log(`📊 Bundle size: ${Math.round(fixedBundle.length / 1024)}KB`);
  } else {
    console.log('❌ Could not find React assignment pattern');
  }
} catch (error) {
  console.error('❌ Error fixing React bundle:', error);
}