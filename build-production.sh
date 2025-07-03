#!/bin/bash

echo "🏗️  Building TheAgencyIQ for production deployment..."

# Clean previous builds
rm -rf dist/
mkdir -p dist/

# Build frontend with minimal Vite config (avoiding Replit plugin issues)
echo "📋 Building React frontend..."
npx vite build --config vite.config.minimal.js

# Build server
echo "🔧 Building server..."
esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist

# Set production mode
export NODE_ENV=production

echo "✅ Production build complete!"
echo "📁 Files ready in dist/ directory"
echo "🚀 Ready for deployment"