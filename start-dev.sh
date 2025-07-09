#!/bin/bash

# DEVELOPMENT PREVIEW SCRIPT
# This script provides a working preview option when the standard dev server fails

echo "🔧 Starting TheAgencyIQ Development Preview..."
echo "📝 Note: Using production build for preview due to Vite config issues"
echo ""

# Build and start the preview server
node preview-server.js