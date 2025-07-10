#!/bin/bash
# Create a standalone React bundle without external dependencies
npx esbuild client/src/main.tsx \
  --bundle \
  --outfile=dist/main.js \
  --platform=browser \
  --format=iife \
  --global-name=App \
  --loader:.tsx=tsx \
  --loader:.ts=ts \
  --loader:.css=css \
  --minify \
  --target=es2020 \
  --define:import.meta.env.VITE_GA_MEASUREMENT_ID='"G-XXXXXXXXXX"' \
  --define:import.meta.env.VITE_STRIPE_PRICE_ID_STARTER='"price_starter"' \
  --define:import.meta.env.VITE_STRIPE_PRICE_ID_GROWTH='"price_growth"' \
  --define:import.meta.env.VITE_STRIPE_PRICE_ID_PROFESSIONAL='"price_professional"' \
  --define:process.env.NODE_ENV='"development"' \
  --external:@assets/*

# Copy CSS separately
npx esbuild client/src/index.css --bundle --outfile=dist/main.css --loader:.css=css --minify