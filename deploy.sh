#!/bin/bash
echo "🚀 TheAgencyIQ Clean Deployment"
echo "==============================="

echo "📦 Starting simplified server..."
node server/index.cjs &
SERVER_PID=$!
sleep 2

echo "🏥 Testing server health..."
if curl -s http://localhost:5000 > /dev/null; then
    echo "✅ Server responded successfully"
else
    echo "❌ Server health check failed"
fi

kill $SERVER_PID 2>/dev/null || true

echo "✅ Deployment test complete"