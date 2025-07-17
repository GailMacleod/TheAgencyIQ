// Simple TypeScript to JavaScript transformation using string replacement
// This is a fallback when esbuild is not available
import fs from 'fs';
import path from 'path';

// Simple JSX transformation function
function transformJSX(code: string): string {
  // Handle simple JSX elements like <App />
  code = code.replace(/<([A-Z][a-zA-Z0-9]*)(\s[^>]*)?\s*\/>/g, (match, tagName, attributes) => {
    const attrs = attributes ? attributes.trim() : '';
    if (attrs) {
      return `React.createElement(${tagName}, { ${attrs} })`;
    }
    return `React.createElement(${tagName})`;
  });
  
  // Handle JSX elements with content like <div>content</div>
  code = code.replace(/<([A-Z][a-zA-Z0-9]*)(\s[^>]*)?>([^<]*)<\/\1>/g, (match, tagName, attributes, content) => {
    const attrs = attributes ? attributes.trim() : '';
    const props = attrs ? `{ ${attrs} }` : 'null';
    if (content.trim()) {
      return `React.createElement(${tagName}, ${props}, "${content.trim()}")`;
    }
    return `React.createElement(${tagName}, ${props})`;
  });
  
  return code;
}

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
    
    // Use the existing working transformation
    let transformedCode = fileContent;
    
    // For JSX files, remove React imports and use global React from CDN
    if (filePath.endsWith('.tsx')) {
      // Remove React imports since we're using CDN
      transformedCode = transformedCode.replace(/import\s+React[^;]*from\s+['"]\s*react\s*['"]\s*;?\s*\n?/g, '');
      transformedCode = transformedCode.replace(/import\s+\{[^}]*\}\s+from\s+['"]\s*react\s*['"]\s*;?\s*\n?/g, '');
      transformedCode = transformedCode.replace(/import\s+[^;]*from\s+['"]\s*react-dom\/client\s*['"]\s*;?\s*\n?/g, '');
      
      // Use global React objects
      transformedCode = transformedCode.replace(/createRoot/g, 'ReactDOM.createRoot');
      transformedCode = transformedCode.replace(/from\s+["']react-dom\/client["']/g, '');
    }
    
    // Simple JSX transformation - convert JSX to React.createElement calls
    transformedCode = transformJSX(transformedCode);
    
    // Don't remove TypeScript extensions globally since we need them for file resolution
    
    // Fix imports to resolve to built JS paths - preserve .tsx extensions for proper resolution
    transformedCode = transformedCode.replace(/from\s+['"](\.\/[^'"]+)['"]/g, (match, importPath) => {
      // Don't remove the .tsx extension since we need it for file resolution
      return match;
    });
    
    // Fix only the import paths that need to be resolved
    transformedCode = transformedCode.replace(/import\s+([^'"]+)\s+from\s+["']([^'"]+)["']/g, (match, imports, importPath) => {
      // Keep .tsx/.ts extensions for relative imports so they can be resolved properly
      if (importPath.startsWith('./') || importPath.startsWith('../')) {
        return match; // Keep as-is for proper file resolution
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
      
      // Skip React imports since we're using CDN
      if (importPath === 'react' || importPath === 'react-dom/client') {
        return ''; // Remove React imports completely
      }
      
      // Handle other bare imports (node_modules) - map to /node_modules/
      if (!importPath.startsWith('./') && !importPath.startsWith('../') && !importPath.startsWith('/')) {
        return `import ${imports} from "/node_modules/${importPath}/index.js"`;
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