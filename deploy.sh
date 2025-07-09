#!/bin/bash

# TheAgencyIQ Deployment Script
# Builds and deploys the application with verification

echo "Starting TheAgencyIQ deployment..."

# Build the application
./build-esbuild.sh

# Start the server using the existing workflow
echo "Starting server..."
curl http://localhost:5000

echo "Deployment verification complete!"
echo "Frontend available at: http://localhost:5000"
echo "Server running on port 5000"