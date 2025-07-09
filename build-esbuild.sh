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
  --minify

echo "Building server with esbuild..."
esbuild server/index.ts \
  --platform=node \
  --packages=external \
  --bundle \
  --format=esm \
  --outdir=dist

echo "Build complete!"