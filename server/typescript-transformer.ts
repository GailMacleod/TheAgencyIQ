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
    
    // Strip .tsx fully and ensure imports resolve to built JS
    let transformedCode = fileContent;
    
    // Remove TypeScript extensions completely
    transformedCode = transformedCode.replace(/\.tsx?\b/g, '');
    
    // Fix imports to resolve to built JS paths
    transformedCode = transformedCode.replace(/from\s+['"](\.\/[^'"]+)['"]/g, (match, importPath) => {
      return match.replace(importPath, importPath.replace(/\.tsx?$/, ''));
    });
    
    // Add React import for JSX files
    if (filePath.endsWith('.tsx') && !transformedCode.includes('import React')) {
      transformedCode = `import React from 'react';\n${transformedCode}`;
    }
    
    // Fix only the import paths that need to be resolved
    transformedCode = transformedCode.replace(/import\s+([^'"]+)\s+from\s+["']([^'"]+)["']/g, (match, imports, importPath) => {
      // Remove .tsx/.ts extensions from relative imports
      if (importPath.startsWith('./') || importPath.startsWith('../')) {
        const cleanPath = importPath.replace(/\.tsx?$/, '');
        return `import ${imports} from "${cleanPath}"`;
      }
      
      // Handle @ aliases
      if (importPath.startsWith('@/')) {
        return `import ${imports} from "/src/${importPath.replace('@/', '')}"`;
      }
      if (importPath.startsWith('@shared/')) {
        return `import ${imports} from "/shared/${importPath.replace('@shared/', '')}"`;
      }
      if (importPath.startsWith('@assets/')) {
        return `import ${imports} from "/attached_assets/${importPath.replace('@assets/', '')}"`;
      }
      
      return match; // Keep all other imports as-is
    });
    
    // Remove CSS imports to prevent module errors
    transformedCode = transformedCode.replace(/import\s+["']([^'"]*\.css)["'];?\s*\n?/g, '// CSS import removed: $1\n');
    
    return transformedCode;
  } catch (error) {
    console.error(`Error transforming ${filePath}:`, error);
    throw error;
  }
}

export function shouldTransform(filePath: string): boolean {
  return filePath.endsWith('.ts') || filePath.endsWith('.tsx') || filePath.endsWith('.js') || filePath.endsWith('.jsx');
}