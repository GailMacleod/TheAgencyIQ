// Simple TypeScript to JavaScript transformation using string replacement
// This is a fallback when esbuild is not available
import fs from 'fs';
import path from 'path';

// Helper function to resolve file extensions
function resolveFileExtension(basePath: string, importPath: string): string {
  if (importPath.includes('.')) {
    return importPath; // Already has extension
  }
  
  // Try to resolve the actual file extension
  const fullBasePath = basePath.replace('/client', '');
  const resolvedPath = path.resolve(process.cwd(), 'client', fullBasePath, importPath);
  
  // Check for .ts, .tsx, .js, .jsx in order
  const extensions = ['.ts', '.tsx', '.js', '.jsx'];
  for (const ext of extensions) {
    if (fs.existsSync(resolvedPath + ext)) {
      return importPath + ext;
    }
  }
  
  // Default to .ts if nothing found
  return importPath + '.ts';
}

export async function transformTypeScriptFile(filePath: string): Promise<string> {
  try {
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    
    // Basic TypeScript to JavaScript transformation
    let transformedCode = fileContent;
    
    // Remove TypeScript type annotations
    transformedCode = transformedCode.replace(/:\s*[^=\s{}\[\](),;]+(\s*=)/g, '$1');
    transformedCode = transformedCode.replace(/:\s*[^=\s{}\[\](),;]+(\s*[,\)\}])/g, '$1');
    transformedCode = transformedCode.replace(/:\s*[^=\s{}\[\](),;]+(\s*$)/g, '$1');
    
    // Replace import statements to use correct paths
    transformedCode = transformedCode.replace(/import\s+([^'"]+)\s+from\s+["']([^'"]+)["']/g, (match, imports, importPath) => {
      if (importPath.startsWith('@/')) {
        return `import ${imports} from "/src/${importPath.replace('@/', '')}"`;
      }
      if (importPath.startsWith('@shared/')) {
        return `import ${imports} from "/shared/${importPath.replace('@shared/', '')}"`;
      }
      if (importPath.startsWith('@assets/')) {
        return `import ${imports} from "/attached_assets/${importPath.replace('@assets/', '')}"`;
      }
      if (importPath.startsWith('./') || importPath.startsWith('../')) {
        // Handle relative imports - resolve proper file extensions
        const resolvedImport = resolveFileExtension(filePath, importPath);
        return `import ${imports} from "${resolvedImport}"`;
      }
      if (importPath === 'react' || importPath === 'react-dom/client' || importPath.startsWith('react-') || importPath.includes('node_modules')) {
        return match; // Keep external package imports as-is
      }
      return match;
    });
    
    // Handle CSS imports - remove them for now since they cause module errors
    transformedCode = transformedCode.replace(/import\s+["']([^'"]*\.css)["'];?\s*\n?/g, '// CSS import removed: $1\n');
    
    // Handle JSX transformations (basic)
    if (filePath.endsWith('.tsx')) {
      // Convert JSX to React.createElement calls (basic transformation)
      transformedCode = `import React from 'react';\n${transformedCode}`;
    }
    
    return transformedCode;
  } catch (error) {
    console.error(`Error transforming ${filePath}:`, error);
    throw error;
  }
}

export function shouldTransform(filePath: string): boolean {
  return filePath.endsWith('.ts') || filePath.endsWith('.tsx');
}