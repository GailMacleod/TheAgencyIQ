#!/bin/bash

# TheAgencyIQ Production Build Script
# Builds React frontend and prepares for deployment

echo "🚀 Starting TheAgencyIQ Production Build..."

# Clean previous builds
echo "🧹 Cleaning previous builds..."
rm -rf dist/
rm -rf client/dist/

# Install dependencies if needed
echo "📦 Checking dependencies..."
npm ci

# Build React frontend
echo "⚡ Building React frontend..."
cd client
npm run build
cd ..

# Copy built files to dist directory
echo "📁 Organizing build files..."
mkdir -p dist/public
cp -r client/dist/* dist/public/

# Verify build size
BUILD_SIZE=$(du -sh dist/public | cut -f1)
echo "📊 Build size: $BUILD_SIZE"

# Check for critical files
if [ -f "dist/public/index.html" ]; then
    echo "✅ index.html found"
else
    echo "❌ index.html missing"
    exit 1
fi

if [ -f "dist/public/assets/index.js" ] || [ -f "dist/public/main.js" ]; then
    echo "✅ JavaScript bundle found"
else
    echo "❌ JavaScript bundle missing"
    exit 1
fi

echo "🎉 Production build complete!"
echo "Build location: ./dist/public/"
echo "Ready for deployment"