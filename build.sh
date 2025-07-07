#!/bin/bash
echo "🎬 Building TheAgencyIQ Video Approval System with esbuild..."

# Clean previous build
rm -rf dist
mkdir -p dist

# Build React frontend with esbuild
echo "⚡ Compiling React frontend..."
npx esbuild client/src/main.tsx \
  --bundle \
  --outfile=dist/main.js \
  --format=iife \
  --target=es2020 \
  --loader:.js=jsx \
  --loader:.tsx=tsx \
  --loader:.ts=ts \
  --loader:.css=css \
  --define:process.env.NODE_ENV='"production"' \
  --jsx=automatic \
  --minify

# Copy HTML template
echo "📄 Creating production HTML..."
cp client/index.html dist/index.html

# Copy static assets
echo "📁 Copying static assets..."
cp -r public dist/ 2>/dev/null || true
cp -r attached_assets dist/ 2>/dev/null || true

echo "✅ Build complete!"
echo "📦 Output: dist/main.js, dist/index.html"
echo "🚀 Ready for deployment"