#!/bin/bash

# TheAgencyIQ Frontend Build Script
# Builds React frontend with esbuild for clean deployment

echo "Building TheAgencyIQ Frontend..."

# Create dist directory
mkdir -p dist

# Build React app with esbuild - exact configuration as requested
npx esbuild client/src/simple-main.tsx --bundle --outfile=dist/main.js --platform=browser --format=iife --loader:.tsx=tsx --jsx=automatic --minify

# Copy CSS if exists
if [ -f "client/src/main.css" ]; then
    cp client/src/main.css dist/main.css
else
    echo "/* TheAgencyIQ Default Styles */" > dist/main.css
fi

# Copy assets
cp -r attached_assets/* dist/ 2>/dev/null || true

# Create simplified HTML
cat > dist/index.html << 'EOF'
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>TheAgencyIQ</title>
    <link rel="stylesheet" href="/main.css">
</head>
<body>
    <div id="root"></div>
    <script src="/main.js"></script>
</body>
</html>
EOF

echo "Build completed successfully!"
echo "Bundle size: $(du -h dist/main.js | cut -f1)"