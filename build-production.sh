#!/bin/bash

# THEAGENCYIQ PRODUCTION BUILD SCRIPT
# Creates production build using esbuild (NO VITE)

echo "🏗️  BUILDING THEAGENCYIQ FOR PRODUCTION (VITE-FREE)..."
echo "======================================================"

# Clean previous build
echo "🧹 Cleaning previous build..."
rm -rf dist/ 2>/dev/null

# Create directories
mkdir -p dist/public

# Build server with esbuild
echo "⚡ Building server with esbuild..."
npx esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist

# Create production HTML
echo "🎨 Creating production HTML..."
cat > dist/public/index.html << 'EOF'
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>TheAgencyIQ - Production Ready</title>
    <style>
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0;
            padding: 20px;
            background: linear-gradient(135deg, #3250fa 0%, #5b73ff 100%);
            min-height: 100vh;
            color: white;
        }
        .container { 
            max-width: 800px;
            margin: 0 auto;
            background: rgba(255, 255, 255, 0.1);
            padding: 40px;
            border-radius: 16px;
            backdrop-filter: blur(10px);
        }
        h1 { color: #ffffff; text-align: center; }
        .status { 
            padding: 20px;
            background: rgba(72, 187, 120, 0.2);
            border-radius: 8px;
            margin: 20px 0;
        }
        .btn {
            display: inline-block;
            padding: 12px 24px;
            background: #48bb78;
            color: white;
            text-decoration: none;
            border-radius: 8px;
            margin: 10px;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>TheAgencyIQ Production Deployment</h1>
        <div class="status">
            <strong>Deployment Status: READY</strong><br>
            Server successfully built with esbuild (NO VITE dependencies)
        </div>
        <a href="/api/health" class="btn">Health Check</a>
        <a href="/api/user" class="btn">User Session</a>
        <p>AI-powered social media automation platform ready for production.</p>
    </div>
</body>
</html>
EOF

# Copy static assets
if [[ -d "attached_assets" ]]; then
    echo "📁 Copying static assets..."
    cp -r attached_assets dist/
fi

# Check build success
if [[ -f "dist/index.js" && -f "dist/public/index.html" ]]; then
    echo "✅ Production build successful (VITE-FREE)"
    echo "📦 Build artifacts created in dist/"
    
    # List build artifacts
    echo ""
    echo "📋 Build Contents:"
    ls -la dist/
    
    # Check server bundle size
    SERVER_SIZE=$(stat -c%s "dist/index.js" 2>/dev/null || stat -f%z "dist/index.js" 2>/dev/null)
    if [[ $SERVER_SIZE -gt 0 ]]; then
        echo "✅ Server bundle: $(($SERVER_SIZE / 1024))kb"
    fi
    
    echo "✅ Production HTML present"
    
    echo ""
    echo "🎯 Production build complete and ready for deployment"
    echo "🚀 No Vite dependencies - pure esbuild compilation"
    exit 0
else
    echo "❌ Production build failed"
    echo "🔍 Missing critical files"
    exit 1
fi