#!/bin/bash

echo "🚀 Starting optimized build process..."

# Clean previous builds
rm -rf dist
mkdir -p dist

# Create optimized bundle with tree-shaking
echo "📦 Building optimized bundle with tree-shaking..."
npx esbuild client/src/main.tsx \
  --bundle \
  --outfile=dist/main.js \
  --format=iife \
  --loader:.js=jsx \
  --loader:.ts=tsx \
  --loader:.tsx=tsx \
  --minify \
  --tree-shaking \
  --target=es2020 \
  --define:process.env.NODE_ENV='"production"' \
  --define:import.meta.env.VITE_GA_MEASUREMENT_ID='""' \
  --external:@assets/agency_logo_1749083054761.png

# Copy static files
echo "📋 Copying static files..."
cp client/index.html dist/index.html
cp -r client/public/* dist/ 2>/dev/null || echo "No public files to copy"

# Copy essential assets only
echo "📁 Copying essential assets..."
mkdir -p dist/attached_assets
cp attached_assets/*.png dist/attached_assets/ 2>/dev/null || echo "No PNG assets"
cp attached_assets/*.pdf dist/attached_assets/ 2>/dev/null || echo "No PDF assets"

# Show bundle size
echo "📊 Bundle analysis:"
ls -lh dist/main.js
du -sh dist/

echo "✅ Optimized build complete!"