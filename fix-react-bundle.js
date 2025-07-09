#!/usr/bin/env node

/**
 * FIX REACT BUNDLE - IMMEDIATE REACT AVAILABILITY
 * This script fixes the React timing issue by ensuring React is available before any components execute
 */

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

console.log('🔧 Fixing React bundle timing issue...');

try {
  // Read the working bundle
  const bundlePath = join(process.cwd(), 'dist/main.js');
  let bundleContent = readFileSync(bundlePath, 'utf-8');

  // Find and extract React imports/setup
  const reactImportMatch = bundleContent.match(/var ([A-Za-z0-9_]+)=B\(P\(\),1\);/);
  const reactAssignMatch = bundleContent.match(/window\.React=([A-Za-z0-9_]+)\.default;/);
  
  if (reactImportMatch && reactAssignMatch) {
    const reactVar = reactImportMatch[1]; // e.g., 'zM'
    const reactAssignVar = reactAssignMatch[1]; // e.g., 'zM'
    
    console.log(`Found React variables: ${reactVar}, ${reactAssignVar}`);
    
    // Create React shim at the beginning of the bundle
    const reactShim = `
// CRITICAL: React Global Shim - Must be FIRST
(function() {
  // Import React immediately
  var React = (function() {
    ${bundleContent.match(/var P=\(\)=>\(P=.*?\(\),P\)/s)?.[0] || ''}
    return P();
  })();
  
  // Make React available globally IMMEDIATELY
  window.React = React;
  window.ReactDOM = React;
  globalThis.React = React;
  globalThis.ReactDOM = React;
  
  console.log('React shim initialized immediately');
})();

`;

    // Remove the original React assignment from the end
    bundleContent = bundleContent.replace(/window\.React=[A-Za-z0-9_]+\.default;/, '');
    
    // Prepend the React shim
    const fixedBundle = reactShim + bundleContent;
    
    // Write the fixed bundle
    writeFileSync(bundlePath, fixedBundle);
    
    console.log('✅ React bundle fixed - React available immediately');
    console.log(`📊 Bundle size: ${Math.round(fixedBundle.length / 1024)}KB`);
  } else {
    console.log('❌ Could not find React variables in bundle');
  }
} catch (error) {
  console.error('❌ Error fixing React bundle:', error);
}