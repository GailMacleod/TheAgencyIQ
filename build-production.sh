#!/bin/bash

# THEAGENCYIQ PRODUCTION BUILD SCRIPT
# Creates production build for deployment validation

echo "🏗️  BUILDING THEAGENCYIQ FOR PRODUCTION..."
echo "=========================================="

# Clean previous build
echo "🧹 Cleaning previous build..."
rm -rf dist/ 2>/dev/null

# Build frontend with Vite
echo "⚡ Building frontend with Vite..."
npm run build

# Check build success
if [[ -d "dist" && -f "dist/index.html" ]]; then
    echo "✅ Frontend build successful"
    echo "📦 Build artifacts created in dist/"
    
    # List build artifacts
    echo ""
    echo "📋 Build Contents:"
    ls -la dist/
    
    # Check for critical files
    if [[ -f "dist/index.html" ]]; then
        echo "✅ index.html present"
    fi
    
    if [[ -d "dist/assets" ]]; then
        echo "✅ Assets directory present"
        ASSET_COUNT=$(ls dist/assets/ 2>/dev/null | wc -l)
        echo "📁 Assets count: $ASSET_COUNT files"
    fi
    
    echo ""
    echo "🎯 Production build complete and ready for testing"
    exit 0
else
    echo "❌ Frontend build failed"
    echo "🔍 Checking for errors..."
    npm run build 2>&1 | tail -10
    exit 1
fi