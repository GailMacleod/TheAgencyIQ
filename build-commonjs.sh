#!/bin/bash
# CommonJS Build Script for TheAgencyIQ
# Replaces Vite with direct esbuild compilation

echo "🔧 Building TheAgencyIQ with CommonJS..."

# Clean previous builds
rm -rf dist

# Build server with esbuild (CommonJS format)
npx esbuild server/index-commonjs.ts --platform=node --packages=external --bundle --format=cjs --outdir=dist

# Check if build was successful
if [ $? -eq 0 ]; then
    # Copy required config files
    cp ai_seo_business_optimized_config.json dist/
    
    # Rename to server.cjs for CommonJS compatibility
    mv dist/index-commonjs.js dist/server.cjs
    
    echo "✅ Build completed successfully!"
    echo "📦 Output: dist/server.cjs"
    echo "🚀 Run: node dist/server.cjs"
    echo "🔧 Config files copied"
else
    echo "❌ Build failed!"
    exit 1
fi