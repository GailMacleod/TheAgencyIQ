#!/bin/bash

echo "🏗️  Building TheAgencyIQ for production deployment..."

# Clean previous builds
rm -rf dist/
mkdir -p dist/public

# Copy client files to dist
echo "📋 Copying client assets..."
cp -r client/* dist/public/
cp client/index.html dist/public/

# Build server
echo "🔧 Building server..."
esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist

# Set production mode
export NODE_ENV=production

echo "✅ Production build complete!"
echo "📁 Files ready in dist/ directory"
echo "🚀 Ready for deployment"