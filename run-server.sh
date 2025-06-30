#!/bin/bash
echo "Stopping existing TypeScript server..."
pkill -f "tsx server/index.ts" || true
sleep 2

echo "Starting CommonJS server on port 5000..."
NODE_ENV=development node server/index.cjs