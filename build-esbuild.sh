#!/bin/bash

# esbuild-based build script for TheAgencyIQ
# Replaces Vite with esbuild for faster, more reliable builds

echo "🚀 Building TheAgencyIQ with esbuild..."

# Clean previous builds
rm -rf dist
mkdir -p dist

# Build client bundle
echo "📦 Building client bundle..."
npx esbuild client/src/main.tsx \
  --bundle \
  --outfile=dist/main.js \
  --platform=browser \
  --format=esm \
  --loader:.js=jsx \
  --loader:.tsx=tsx \
  --loader:.png=file \
  --loader:.jpg=file \
  --loader:.jpeg=file \
  --loader:.gif=file \
  --loader:.svg=file \
  --alias:@=./client/src \
  --alias:@shared=./shared \
  --alias:@assets=./attached_assets \
  --define:import.meta.env.VITE_GA_MEASUREMENT_ID='"G-XXXXXXXXXX"' \
  --define:import.meta.env.VITE_STRIPE_PRICE_ID_STARTER='"price_starter"' \
  --define:import.meta.env.VITE_STRIPE_PRICE_ID_GROWTH='"price_growth"' \
  --jsx=automatic \
  --jsx-import-source=react \
  --minify

# Build server bundle
echo "🖥️ Building server bundle..."
npx esbuild server/index.ts \
  --bundle \
  --outfile=dist/server.js \
  --format=esm \
  --platform=node \
  --target=node18 \
  --external:express \
  --external:cors \
  --external:helmet \
  --external:express-session \
  --external:connect-pg-simple \
  --external:passport \
  --external:passport-local \
  --external:passport-facebook \
  --external:passport-google-oauth20 \
  --external:passport-linkedin-oauth2 \
  --external:passport-twitter \
  --external:bcrypt \
  --external:drizzle-orm \
  --external:@neondatabase/serverless \
  --external:zod \
  --external:axios \
  --external:multer \
  --external:openai \
  --external:stripe \
  --external:twilio \
  --external:@sendgrid/mail \
  --external:ws \
  --external:replicate \
  --external:crypto-js \
  --external:date-fns \
  --external:memoizee \
  --external:oauth-1.0a \
  --external:openid-client \
  --external:knex \
  --external:sqlite3 \
  --minify \
  --sourcemap \
  --define:process.env.NODE_ENV='"production"'

# Copy index.html and update script reference
echo "📄 Creating index.html..."
cp client/index.html dist/index.html
sed -i 's|<script type="module" src="/src/main.tsx"></script>|<script type="module" src="/main.js"></script>|' dist/index.html

# Copy static assets
echo "📁 Copying static assets..."
mkdir -p dist/attached_assets
cp -r attached_assets/* dist/attached_assets/ 2>/dev/null || true
cp -r public/* dist/ 2>/dev/null || true

# Copy essential config files
echo "⚙️ Copying configuration files..."
cp ai_seo_business_optimized_config.json dist/ 2>/dev/null || true

# Create production package.json
echo "📦 Creating production package.json..."
cat > dist/package.json << EOF
{
  "name": "theagencyiq",
  "version": "1.0.0",
  "type": "module",
  "main": "server.js",
  "scripts": {
    "start": "node server.js"
  }
}
EOF

# Verify build
echo "🔍 Verifying build..."
if [ -f "dist/main.js" ] && [ -f "dist/server.js" ] && [ -f "dist/index.html" ]; then
  echo "✅ Build completed successfully!"
  echo "📊 Build output:"
  echo "  - Client bundle: $(du -h dist/main.js | cut -f1)"
  echo "  - Server bundle: $(du -h dist/server.js | cut -f1)"
  echo "  - Total size: $(du -sh dist | cut -f1)"
  echo ""
  echo "🚀 Ready to run: node dist/server.js"
else
  echo "❌ Build failed - missing required files"
  exit 1
fi