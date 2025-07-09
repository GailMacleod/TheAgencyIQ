#!/bin/bash

# COMPREHENSIVE DEPLOYMENT SCRIPT FOR THEAGENCYIQ
# Validates build process, tests functionality, and prepares for production deployment

echo "🚀 Starting TheAgencyIQ deployment validation..."

# 1. Build Production Bundle
echo "📦 Building production bundle..."
node scripts/build-production.js

if [ $? -ne 0 ]; then
    echo "❌ Build failed. Deployment aborted."
    exit 1
fi

# 2. Test Production Server Start
echo "🔧 Testing production server startup..."
PORT=5001 timeout 10s node dist/server.js &
SERVER_PID=$!

sleep 5

# Check if server is running
if kill -0 $SERVER_PID 2>/dev/null; then
    echo "✅ Production server started successfully on port 5001"
    kill $SERVER_PID
else
    echo "❌ Production server failed to start"
    exit 1
fi

# 3. Validate Build Output
echo "📋 Validating build output..."

if [ -f "dist/server.js" ]; then
    echo "✅ Server bundle created"
    BUNDLE_SIZE=$(du -h dist/server.js | cut -f1)
    echo "📊 Server bundle size: $BUNDLE_SIZE"
else
    echo "❌ Server bundle missing"
    exit 1
fi

if [ -f "dist/static/main.js" ]; then
    echo "✅ Client bundle created"
    CLIENT_SIZE=$(du -h dist/static/main.js | cut -f1)
    echo "📊 Client bundle size: $CLIENT_SIZE"
else
    echo "❌ Client bundle missing"
    exit 1
fi

# 4. Check for Critical Files
echo "🔍 Checking critical files..."

FILES_TO_CHECK=(
    "dist/index.html"
    "server/index.ts"
    "shared/schema.ts"
    "client/src/main.tsx"
)

for file in "${FILES_TO_CHECK[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ $file exists"
    else
        echo "❌ $file missing"
        exit 1
    fi
done

# 5. Validate Dependencies
echo "🔗 Validating dependencies..."
if [ -f "package.json" ]; then
    echo "✅ Package.json exists"
    if [ -d "node_modules" ]; then
        echo "✅ Node modules installed"
    else
        echo "⚠️  Node modules missing - run npm install"
    fi
else
    echo "❌ Package.json missing"
    exit 1
fi

# 6. Environment Check
echo "🌍 Environment validation..."
if [ -f ".env" ]; then
    echo "✅ Environment file exists"
else
    echo "⚠️  .env file missing - ensure production secrets are configured"
fi

# 7. Database Check
echo "🗄️  Database validation..."
if [ -n "$DATABASE_URL" ]; then
    echo "✅ Database URL configured"
else
    echo "⚠️  DATABASE_URL not set - ensure database is configured"
fi

echo ""
echo "🎯 DEPLOYMENT VALIDATION COMPLETE"
echo "=================================="
echo "✅ Build successful"
echo "✅ Server startup tested"
echo "✅ Bundle validation passed"
echo "✅ Critical files verified"
echo ""
echo "🚀 Ready for deployment!"
echo "Run: node dist/server.js"
echo ""
echo "📝 Next steps:"
echo "1. Configure production secrets in Replit Deployments"
echo "2. Set DATABASE_URL in production environment"
echo "3. Deploy using Replit's deployment system"
echo "4. Verify all OAuth endpoints are working"
echo ""

exit 0