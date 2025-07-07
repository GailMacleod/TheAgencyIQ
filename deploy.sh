#!/bin/bash

echo "🚀 Starting TheAgencyIQ deployment process..."
echo "📅 Deploy timestamp: $(date)"

# Stop any existing server process
echo "🛑 Stopping existing server..."
pkill -f "node server" || true
sleep 2

# Start the server
echo "⚡ Starting production server..."
node server/index.ts &
SERVER_PID=$!
sleep 5

# Test server health
echo "🔍 Testing server health..."
for i in {1..10}; do
  if curl -s http://localhost:5000 > /dev/null 2>&1; then
    echo "✅ Server is healthy and responding"
    break
  fi
  echo "   Waiting for server... ($i/10)"
  sleep 3
done

# Validate server is running
if ! curl -s http://localhost:5000 > /dev/null 2>&1; then
  echo "❌ Server failed to start or respond"
  exit 1
fi

echo "✅ TheAgencyIQ deployment completed successfully!"
echo "🚀 Server running on port 5000"