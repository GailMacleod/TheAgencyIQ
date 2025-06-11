# Phone Update Microservice

Standalone microservice for phone number updates with Twilio integration, designed to replace Replit's phone update functionality and fix "Unexpected token '<' <!DOCTYPE..." errors.

## Features

- **Two-Step SMS Verification**: Generate code → Verify code → Update phone with data migration
- **SQLite Database**: Lightweight, file-based storage for user data and verification codes
- **Twilio Integration**: Real SMS verification using existing signup credentials
- **Data Migration**: Complete phone UID updates across all related tables
- **Ngrok Ready**: Public tunnel for testing with Replit frontend
- **JSON Only**: Enforced JSON responses to prevent HTML/DOCTYPE errors

## Quick Setup

### 1. Install Dependencies
```bash
cd phone-update-service
npm install
```

### 2. Environment Configuration
```bash
cp .env.example .env
# Edit .env with your Twilio credentials (same as signup process)
```

### 3. Start Microservice
```bash
npm start
# Server runs on http://localhost:3000
```

### 4. Setup Ngrok Tunnel (for Replit integration)
```bash
# Install ngrok: https://ngrok.com/download
ngrok http 3000
# Note the public URL: https://abcd1234.ngrok.io
```

### 5. Import Data from Replit
```bash
# Get export from Replit /api/export-data
curl -X POST "http://localhost:3000/import-data" \
  -H "Content-Type: application/json" \
  -d @replit-export.json
```

## API Endpoints

### Phone Update (Two-Step Process)

**Step 1: Generate SMS Code**
```bash
curl -X POST "http://localhost:3000/update-phone" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "gailm@macleodglba.com.au",
    "newPhone": "+610424835189"
  }'
# Response: {"success":true,"message":"Verification code sent to your phone","developmentCode":"123456"}
```

**Step 2: Verify Code and Update Phone**
```bash
curl -X POST "http://localhost:3000/update-phone" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "gailm@macleodglba.com.au",
    "newPhone": "+610424835189",
    "verificationCode": "123456"
  }'
# Response: {"success":true,"newPhone":"+610424835189","message":"Phone number updated successfully with complete data migration"}
```

### Health Check
```bash
curl -X GET "http://localhost:3000/health"
# Response: {"status":"healthy","service":"phone-update-microservice","timestamp":"2025-06-11T01:50:00.000Z"}
```

### Data Import
```bash
curl -X POST "http://localhost:3000/import-data" \
  -H "Content-Type: application/json" \
  -d '{
    "users": [...],
    "post_ledger": [...],
    "post_schedule": [...]
  }'
```

## Database Schema

SQLite database (`users.db`) with tables:
- `users` - User accounts with phone UID architecture
- `post_ledger` - Quota tracking by user_id (phone number)
- `post_schedule` - Scheduled posts by user_id (phone number)
- `verification_codes` - SMS verification codes with expiration

## Integration with Replit Frontend

The client-side integration automatically routes phone update calls to the microservice:

```javascript
// Automatically routes to microservice
const response = await apiRequest('POST', '/update-phone', {
  email: 'user@example.com',
  newPhone: '+610424835189'
});
```

## Production Deployment

### Using Ngrok (Development/Testing)
```bash
ngrok http 3000
# Update client/src/lib/api.ts with ngrok URL
```

### Using Heroku
```bash
# Create Heroku app
heroku create phone-update-microservice

# Add environment variables
heroku config:set TWILIO_ACCOUNT_SID=your_sid
heroku config:set TWILIO_AUTH_TOKEN=your_token
heroku config:set TWILIO_PHONE_NUMBER=your_number

# Deploy
git subtree push --prefix phone-update-service heroku main
```

### Using Railway
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login and deploy
railway login
railway new phone-update-microservice
railway up
```

## Testing Script

Complete test sequence:

```bash
#!/bin/bash
# test-microservice.sh

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
```

## Troubleshooting

### Common Issues

1. **SMS not sending**: Check Twilio credentials in .env file
2. **Database errors**: Ensure SQLite3 is properly installed
3. **CORS issues**: Microservice allows all origins for testing
4. **Ngrok tunnel expired**: Restart ngrok and update client URL

### Logs

All operations are logged to console:
- SMS sending attempts
- Database operations
- Data migration steps
- Error details

### Rollback Plan

If microservice fails:
1. Stop microservice
2. Revert client/src/lib/api.ts changes
3. Use Replit's fixed /api/update-phone endpoint
4. Export microservice data back to Replit if needed

## Architecture Benefits

- **Separation of Concerns**: Phone updates isolated from main application
- **Scalability**: Independent scaling and deployment
- **Reliability**: SQLite provides data persistence without external dependencies
- **Testability**: Standalone testing without affecting main application
- **Flexibility**: Easy to migrate to different platforms or frameworks