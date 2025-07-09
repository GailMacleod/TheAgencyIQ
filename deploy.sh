#!/bin/bash

# Deploy script for TheAgencyIQ
./build-esbuild.sh && node server/index.ts &

# Wait for server to start
sleep 2

# Test the deployment
curl http://localhost:5000

# Keep the server running
wait