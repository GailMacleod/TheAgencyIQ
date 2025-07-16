const fs = require('fs');
const path = require('path');

// Function to fix imports in a file
function fixImports(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Replace @/ with correct relative path based on file location
    const relativePath = path.relative(path.dirname(filePath), 'src');
    const basePath = relativePath ? `${relativePath}/` : './';
    
    // Replace all @/ imports with correct relative paths
    const fixedContent = content.replace(/@\//g, basePath);
    
    // Only write if content changed
    if (fixedContent !== content) {
      fs.writeFileSync(filePath, fixedContent);
      console.log(`Fixed imports in: ${filePath}`);
    }
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error.message);
  }
}

// Function to find all TypeScript/JavaScript files
function findFiles(dir, files = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    
    if (entry.isDirectory()) {
      findFiles(fullPath, files);
    } else if (entry.isFile() && /\.(ts|tsx|js|jsx)$/.test(entry.name)) {
      files.push(fullPath);
    }
  }
  
  return files;
}

// Fix all imports in src directory
const srcFiles = findFiles('./src');
srcFiles.forEach(fixImports);

console.log('Import fixing complete!');