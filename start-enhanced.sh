#!/bin/bash
echo "🚀 Starting Enhanced Development Server with Vite Configuration..."
pkill -f "node app.js" 2>/dev/null || true
pkill -f "enhanced-dev-server.js" 2>/dev/null || true
sleep 2
node enhanced-dev-server.js