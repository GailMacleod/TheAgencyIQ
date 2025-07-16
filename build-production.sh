#!/bin/bash

# Enhanced Production Build Script for TheAgencyIQ
# Consolidates build process with esbuild for speed and includes health checks

set -e

echo "🚀 Starting Production Build for TheAgencyIQ"
echo "=============================================="

# Clean previous builds
echo "🧹 Cleaning previous builds..."
rm -rf dist/
rm -rf build/
rm -rf .next/

# Install dependencies if needed
echo "📦 Checking dependencies..."
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi

# Build frontend with Vite (optimized for production)
echo "🔨 Building frontend with Vite..."
npm run build

# Build backend with esbuild (fast compilation)
echo "⚡ Building backend with esbuild..."
npx esbuild server/index.ts \
  --bundle \
  --platform=node \
  --target=node18 \
  --format=cjs \
  --outfile=dist/server.js \
  --external:@neondatabase/serverless \
  --external:ws \
  --external:drizzle-kit \
  --external:pg \
  --external:bcrypt \
  --external:stripe \
  --external:twilio \
  --external:@sendgrid/mail \
  --external:passport \
  --external:express-session \
  --external:connect-pg-simple \
  --external:multer \
  --external:axios \
  --external:openai \
  --minify \
  --sourcemap

# Copy package.json and install production dependencies
echo "📋 Preparing production package..."
cp package.json dist/
cd dist && npm install --production --silent
cd ..

# Copy essential files
echo "📁 Copying essential files..."
cp -r server/public dist/ 2>/dev/null || true
cp -r public dist/ 2>/dev/null || true
cp .env dist/ 2>/dev/null || true

# Run health checks
echo "🏥 Running post-build health checks..."

# Start server in background for testing
echo "Starting server for health checks..."
cd dist
NODE_ENV=production timeout 30s node server.js &
SERVER_PID=$!
cd ..

# Wait for server to start
sleep 5

# Health check endpoints
echo "Testing health endpoints..."
HEALTH_CHECKS=0
HEALTH_PASSED=0

# Basic server health
if curl -f -s "http://localhost:3000/api/health" > /dev/null; then
    echo "✅ Server health check passed"
    HEALTH_PASSED=$((HEALTH_PASSED + 1))
else
    echo "❌ Server health check failed"
fi
HEALTH_CHECKS=$((HEALTH_CHECKS + 1))

# Database connectivity
if curl -f -s "http://localhost:3000/api/db-health" > /dev/null; then
    echo "✅ Database health check passed"
    HEALTH_PASSED=$((HEALTH_PASSED + 1))
else
    echo "❌ Database health check failed"
fi
HEALTH_CHECKS=$((HEALTH_CHECKS + 1))

# Authentication endpoints
if curl -f -s "http://localhost:3000/api/auth/status" > /dev/null; then
    echo "✅ Authentication health check passed"
    HEALTH_PASSED=$((HEALTH_PASSED + 1))
else
    echo "❌ Authentication health check failed"
fi
HEALTH_CHECKS=$((HEALTH_CHECKS + 1))

# Stop test server
kill $SERVER_PID 2>/dev/null || true

# Build summary
echo ""
echo "📊 BUILD SUMMARY"
echo "================"
echo "Frontend Build: ✅ Complete"
echo "Backend Build: ✅ Complete"
echo "Health Checks: $HEALTH_PASSED/$HEALTH_CHECKS passed"

if [ $HEALTH_PASSED -eq $HEALTH_CHECKS ]; then
    echo "🎉 Production build successful and all health checks passed!"
    echo "Ready for deployment"
    exit 0
else
    echo "⚠️  Production build complete but some health checks failed"
    echo "Review failed checks before deployment"
    exit 1
fi