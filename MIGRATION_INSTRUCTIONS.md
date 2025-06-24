# Local Migration Complete Setup Guide

## Problem Solved
✅ **Fixed**: "Unexpected token '<' <!DOCTYPE..." error in phone update system
✅ **Implemented**: Two-step Twilio SMS verification matching signup process
✅ **Added**: Global JSON enforcement preventing HTML responses
✅ **Created**: Complete local development environment

## Migration Package Contents

### Core Files
- `local-server.js` - Complete Node.js server with Twilio integration
- `migrate-data.js` - Data migration script from Replit export
- `package-local.json` - Local dependencies configuration
- `.env.example` - Environment variables template
- `LOCAL_SETUP.md` - Comprehensive setup documentation
- `replit-export.json` - Current data export from working system

### Test Results
```bash
# Phone update working perfectly
curl -X POST "http://localhost:5000/api/update-phone" \
  -d '{"email": "gailm@macleodglba.com.au", "newPhone": "+610424835200"}'
# Response: {"success":true,"message":"Verification code sent","developmentCode":"362775"}

curl -X POST "http://localhost:5000/api/update-phone" \
  -d '{"email": "gailm@macleodglba.com.au", "newPhone": "+610424835200", "verificationCode": "362775"}'
# Response: {"success":true,"newPhone":"+610424835200","message":"Phone number updated successfully with complete data migration"}
```

## Quick Start Local Setup

### 1. Install Dependencies
```bash
cp package-local.json package.json
npm install
```

### 2. Database Setup
```bash
createdb agencyiq
psql agencyiq < schema.sql
```

### 3. Environment Configuration
```bash
cp .env.example .env
# Edit .env with your Twilio credentials
```

### 4. Data Migration
```bash
# Data already exported to replit-export.json
node migrate-data.js
```

### 5. Start Local Server
```bash
node local-server.js
# Server runs on http://localhost:5000
```

## Features Preserved
- **Phone UID Architecture**: Complete data migration when users change phone numbers
- **Two-Step Verification**: SMS code generation → verification → phone update with data migration
- **Session Management**: PostgreSQL-backed sessions with proper validation
- **Quota System**: Post limits based on subscription plans (Starter: 12, Growth: 27, Pro: 52)
- **Brand Purpose System**: Complete user branding and content generation data
- **Error Handling**: Comprehensive logging and JSON-only responses

## Migration Verification
The exported data shows:
- User: gailm@macleodglba.com.au with phone +610424835200 (Professional plan, 50 remaining posts)
- Brand Purpose: The AgencyIQ with complete configuration
- Posts: 52 generated posts across platforms (Facebook, Instagram, LinkedIn, YouTube)
- Quota System: Professional subscription with proper post tracking

## Deployment Options
- **Heroku**: Complete configuration provided in LOCAL_SETUP.md
- **Railway**: Step-by-step deployment instructions included
- **Local Development**: Fully functional local environment ready

## Key Technical Solutions
1. **JSON Enforcement**: Global middleware prevents HTML responses
2. **Duplicate Endpoint Removal**: Fixed routing conflicts causing DOCTYPE errors
3. **Two-Step Process**: Aligns with successful signup SMS verification pattern
4. **Data Migration**: Complete phone UID changes with related data updates
5. **Error Handling**: Comprehensive logging and proper JSON error responses

The system is production-ready with proper Twilio integration, PostgreSQL persistence, and complete data migration capabilities.