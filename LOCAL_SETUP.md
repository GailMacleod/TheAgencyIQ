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
```

## Dependencies
```bash
npm install pg twilio dotenv
```

## Data Export from Replit
Use the `/api/export-data` endpoint to get your current data and import to local PostgreSQL.

## Key Features Preserved
- Brand Purpose functionality
- Quota system with 30-day rolling periods
- OAuth platform connections
- Google Analytics integration
- Complete phone UID architecture
- SMS verification for phone updates