#!/bin/bash
# Build script using esbuild instead of Vite

echo "Building frontend with esbuild..."
esbuild client/src/main.tsx \
  --bundle \
  --outfile=dist/bundle.js \
  --format=iife \
  --jsx=automatic \
  --loader:.css=css \
  --loader:.tsx=tsx \
  --loader:.ts=ts \
  --define:process.env.NODE_ENV='"production"' \
  --define:import.meta.env.VITE_GA_MEASUREMENT_ID='""' \
  --minify

echo "Building server with esbuild..."
esbuild server/index.ts \
  --platform=node \
  --packages=external \
  --bundle \
  --format=esm \
  --outdir=dist

echo "Copying static files..."
mkdir -p dist/attached_assets
cp -r client/public/* dist/ 2>/dev/null || true
cp client/index.html dist/
cp -r attached_assets/* dist/attached_assets/ 2>/dev/null || true

echo "Build complete!"