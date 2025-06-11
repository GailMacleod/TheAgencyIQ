# Local Development Setup with Twilio Integration

## Prerequisites
1. PostgreSQL installed locally
2. Twilio account with SMS capability
3. Node.js environment

## Database Setup
```bash
# Create local database
createdb agencyiq

# Connect and run schema
psql agencyiq < schema.sql
```

## Environment Variables
Create `.env` file:
```
DATABASE_URL=postgresql://username:password@localhost:5432/agencyiq
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=your_twilio_number
SESSION_SECRET=your_session_secret
```

## Dependencies
```bash
npm install pg twilio dotenv express-session
```

## Data Export from Replit
1. Export current data: `curl -X GET "http://localhost:5000/api/export-data" --cookie cookies.txt`
2. Import to local PostgreSQL using the exported JSON

## Testing Phone Updates
```bash
# Test phone update with SMS verification
curl -X POST "http://localhost:5000/api/update-phone" \
  -H "Content-Type: application/json" \
  -d '{"email": "gailm@macleodglba.com.au", "newPhone": "+610424835189", "verificationCode": "123456"}'

# Expected response: {"success": true, "newPhone": "+610424835189"}
```

## Key API Endpoints
- `/api/export-data` - Export all data for migration
- `/api/send-sms-code` - Send SMS verification code
- `/api/update-phone` - Update phone with complete data migration
- `/api/quota-status` - Check posting quota
- `/api/brand-posts` - Generate content
- `/api/approve-post` - Approve and schedule posts

## Features Preserved
- Brand Purpose functionality with AI content generation
- Quota system with 30-day rolling periods  
- OAuth platform connections (Facebook, Instagram, LinkedIn, X, YouTube)
- Google Analytics integration
- Complete phone UID architecture with data migration
- SMS verification for secure phone updates
- Breach notification and data cleanup services