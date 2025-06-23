#!/bin/bash

# Direct cURL token exchange for X OAuth 2.0
CLIENT_ID="cW5vZXdCQjZwSmVsM24wYVpCV3Y6MTpjaQ"
AUTH_CODE="OGRWNEl3dkx0WGxXT1NQdUc2MnJNNFZaTjh0UkVwdFFPWUF2bFk1X01vOF84OjE3NTA2NjA1MTg1MDI6MTowOmFjOjE"
CODE_VERIFIER="GjX9WJk3w8DsjHqSw1Bmuqegdr-wMxXMtt31rFyVN-c"
REDIRECT_URI="https://4fc77172-459a-4da7-8c33-5014abb1b73e-00-dqhtnud4ismj.worf.replit.dev/"

echo "🔄 CURL TOKEN EXCHANGE"
echo "====================="

# Create basic auth header
AUTH_HEADER=$(echo -n "${CLIENT_ID}:${X_0AUTH_CLIENT_SECRET}" | base64)

curl -X POST https://api.twitter.com/2/oauth2/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -H "Authorization: Basic ${AUTH_HEADER}" \
  -d "grant_type=authorization_code" \
  -d "client_id=${CLIENT_ID}" \
  -d "code=${AUTH_CODE}" \
  -d "redirect_uri=${REDIRECT_URI}" \
  -d "code_verifier=${CODE_VERIFIER}" \
  -v