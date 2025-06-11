#!/bin/bash

echo "Testing Phone Update Microservice..."

# Test health check
echo "1. Health check..."
curl -X GET "http://localhost:3000/health"

# Test Step 1: Generate code
echo -e "\n\n2. Generating SMS code..."
RESPONSE=$(curl -s -X POST "http://localhost:3000/update-phone" \
  -H "Content-Type: application/json" \
  -d '{"email": "gailm@macleodglba.com.au", "newPhone": "+610424835189"}')

echo $RESPONSE

# Extract development code
CODE=$(echo $RESPONSE | grep -o '"developmentCode":"[^"]*"' | cut -d'"' -f4)
echo "Development code: $CODE"

# Test Step 2: Verify code
echo -e "\n\n3. Verifying code and updating phone..."
curl -X POST "http://localhost:3000/update-phone" \
  -H "Content-Type: application/json" \
  -d "{\"email\": \"gailm@macleodglba.com.au\", \"newPhone\": \"+610424835189\", \"verificationCode\": \"$CODE\"}"

echo -e "\n\nTest completed!"