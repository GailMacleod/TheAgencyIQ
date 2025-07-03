#!/bin/bash

# Development server startup script that bypasses Vite issues
echo "🚀 Starting TheAgencyIQ Development Server..."

# Set development environment
export NODE_ENV=development

# Start the server with enhanced static serving
echo "📡 Starting server with React support..."
tsx server/index.ts &

# Wait for server to start
sleep 3

echo "✅ Development server running on port 5000"
echo "🌐 Application accessible at: https://4fc77172-459a-4da7-8c33-5014abb1b73e-00-dqhtnud4ismj.worf.replit.dev"
echo "🔧 React application served with enhanced static serving"

# Keep script running
wait