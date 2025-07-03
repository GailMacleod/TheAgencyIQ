#!/bin/bash

echo "🚀 BUILDING THEAGENCYIQ PRODUCTION BUNDLE"
echo "========================================"

# Build using minimal vite config to avoid Replit plugin issues
echo "📦 Building with minimal vite config..."
npx vite build --config vite.config.minimal.js

# Check if build succeeded
if [ $? -eq 0 ]; then
    echo "✅ Production build completed successfully"
    
    # Get bundle size
    if [ -d "dist" ]; then
        BUNDLE_SIZE=$(du -sh dist 2>/dev/null | cut -f1)
        echo "📊 Bundle size: $BUNDLE_SIZE"
        
        # List main files
        echo "📁 Build contents:"
        ls -la dist/ 2>/dev/null || echo "No dist directory found"
        
        echo ""
        echo "🎉 Production build ready for deployment!"
        echo "   Run the server and test on port 5000"
    else
        echo "❌ Build directory not found"
        exit 1
    fi
else
    echo "❌ Build failed"
    exit 1
fi