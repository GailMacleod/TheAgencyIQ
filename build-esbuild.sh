#!/bin/bash

echo "🏗️  BUILDING THEAGENCYIQ WITH ESBUILD (VITE-FREE)..."
echo "=================================================="

# Clean previous build
echo "🧹 Cleaning previous build..."
rm -rf dist
mkdir -p dist

# Build frontend with esbuild
echo "⚡ Building frontend with esbuild..."
npx esbuild client/src/main.tsx --bundle --outfile=dist/main.js --format=esm --loader:.js=jsx --loader:.tsx=tsx --target=es2020 --minify \
  --define:import.meta.env.VITE_GA_MEASUREMENT_ID=\"undefined\"

# Copy HTML template
echo "📄 Creating production HTML..."
cp client/index.html dist/index.html

# Update script reference in HTML
echo "🔧 Updating script references..."
sed -i 's|type="module" src="/src/main.tsx"|type="module" src="/main.js"|g' dist/index.html

# Copy static assets
echo "📁 Copying static assets..."
cp -r public dist/ 2>/dev/null || true
cp -r attached_assets dist/ 2>/dev/null || true

echo "✅ esbuild frontend build complete"
echo "📦 Build artifacts created in dist/"

# Show build size
if [ -f "dist/main.js" ]; then
    SIZE=$(du -h dist/main.js | cut -f1)
    echo "✅ Frontend bundle: $SIZE"
else
    echo "❌ Frontend build failed"
    exit 1
fi

echo "🚀 Frontend ready for deployment (Vite-free)"