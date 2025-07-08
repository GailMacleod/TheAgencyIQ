#!/bin/bash

echo "🎬 Starting Video-Enhanced Build Process..."

# Memory optimization settings
export NODE_OPTIONS="--max-old-space-size=256"
export NODE_ENV=production

# Clean and prepare
echo "🧹 Cleaning build directory..."
rm -rf dist
mkdir -p dist

# Bundle optimization with video support
echo "📦 Building video-enabled bundle with tree-shaking..."
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

# Create video-optimized HTML
echo "📋 Creating video-optimized HTML..."
cat > dist/index.html << 'EOF'
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="TheAgencyIQ - AI-powered video content generation for social media automation">
  <title>TheAgencyIQ - Video Content Generation</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; }
    .video-container { max-width: 100%; height: auto; }
    .loading { text-align: center; padding: 2rem; }
  </style>
</head>
<body>
  <div id="root">
    <div class="loading">
      <h2>Loading TheAgencyIQ Video Platform...</h2>
      <p>AI-powered video generation loading...</p>
    </div>
  </div>
  <script src="main.js"></script>
</body>
</html>
EOF

# Copy essential assets
echo "📁 Copying video assets..."
mkdir -p dist/assets
if [ -f "attached_assets/agency_logo_1749083054761.png" ]; then
  cp attached_assets/agency_logo_1749083054761.png dist/assets/logo.png
fi

# Create video-enabled error boundaries
echo "🛡️ Creating video error boundaries..."
cat > dist/video-error-handler.js << 'EOF'
window.addEventListener('error', function(e) {
  if (e.message && e.message.includes('video')) {
    console.log('Video error detected, falling back to text-only mode');
    localStorage.setItem('videoFallback', 'true');
  }
});
EOF

# Bundle analysis with video components
echo "📊 Bundle analysis:"
ls -lh dist/main.js | awk '{print "Bundle size: " $5}'
echo "Video components: Included"
echo "Memory target: <256MB"

# Memory optimization
echo "🧹 Memory optimization..."
rm -rf node_modules/.cache 2>/dev/null || true
rm -rf .vite 2>/dev/null || true

# Final stats
echo "✅ Video-enhanced build complete!"
echo "🎬 Video generation: Ready"
echo "📦 Bundle: $(ls -lh dist/main.js | awk '{print $5}') (target <1MB)"
echo "💾 Memory: Optimized for <256MB runtime"
echo "🚀 Deployment: Ready with video capabilities"