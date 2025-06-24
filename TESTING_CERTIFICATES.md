# Gift Certificate Testing Guide

## Complete Implementation Overview

The gift certificate system has been successfully located and integrated into the admin dashboard with full data export capabilities.

### Database Schema
```sql
-- Located in shared/schema.ts and PostgreSQL database
CREATE TABLE gift_certificates (
  id SERIAL PRIMARY KEY,
  code VARCHAR(50) NOT NULL UNIQUE,
  plan VARCHAR(20) NOT NULL,
  is_used BOOLEAN DEFAULT FALSE,
  created_for VARCHAR(100) NOT NULL,
  redeemed_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  redeemed_at TIMESTAMP
);
```

### Admin Endpoints Added

#### 1. Admin User Data with Gift Certificates
```bash
curl -X GET "http://localhost:5000/api/admin/users" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json"
```

**Response includes:**
- User phone UID, email, subscription plan
- Post ledger and scheduling data
- Gift certificates (code, redeemed status, plan, redemption details)

#### 2. Data Location Check
```bash
curl -X GET "http://localhost:5000/api/locate-data"
```

**Response:**
```json
{
  "dataSource": "postgresql",
  "giftSource": "postgresql"
}
```

#### 3. Complete Data Export with Certificates
```bash
curl -X GET "http://localhost:5000/api/export-data" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  > theagencyiq-export-with-gifts.json
```

**Export includes:**
- All users with phone UID system
- Post ledger and scheduling data
- Complete gift_certificates table
- Brand purpose and platform connections
- Export metadata with timestamps

## Admin Dashboard Features

### Access the Admin Dashboard
Visit: `http://localhost:5000/admin`

### Dashboard Components
1. **Data Source Information** - Shows PostgreSQL as primary data source
2. **Summary Statistics**:
   - Total users count
   - Gift certificates (total and redeemed)
   - Total posts scheduled
   - Active subscription plans breakdown

3. **User Data Table** - Complete user overview with:
   - Phone number (unique identifier)
   - Email address
   - Subscription plan badges
   - Scheduled posts count
   - Gift certificate codes and redemption status

4. **Gift Certificate Details** - Detailed certificate tracking:
   - Certificate codes with status badges
   - Plan type (professional, growth, starter)
   - Creation purpose (e.g., "Testing Program")
   - Redemption details with user information
   - Redemption timestamps

5. **Export Functionality** - One-click data export with:
   - Complete database dump
   - Gift certificates included
   - JSON format download
   - Timestamped filenames

## Testing Existing Gift Certificates

### 1. Check Current Certificates
```bash
# Query existing certificates
curl -X GET "http://localhost:5000/api/admin/users" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" | \
  jq '.[] | select(.gifts | length > 0) | {email, gifts}'
```

### 2. Generate New Test Certificates
```bash
# Generate 5 professional plan certificates
curl -X POST "http://localhost:5000/api/generate-gift-certificates" \
  -H "Content-Type: application/json" \
  -d '{
    "count": 5,
    "plan": "professional",
    "createdFor": "Admin Testing"
  }'
```

### 3. Test Certificate Redemption
```bash
# Login first to establish session
curl -X POST "http://localhost:5000/api/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password"
  }' \
  --cookie-jar test_session.txt

# Redeem certificate
curl -X POST "http://localhost:5000/api/redeem-gift-certificate" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "PROF-TEST-ABCD1234"
  }' \
  --cookie test_session.txt
```

## Frontend Integration

### Admin Dashboard Access
The admin dashboard is now available at `/admin` route in the application with:
- Real-time data fetching from PostgreSQL
- Interactive gift certificate management
- Export functionality with download
- Responsive design for mobile and desktop

### Gift Certificate Display
- Status badges (Available/Redeemed)
- Plan type indicators
- User redemption tracking
- Creation purpose labels
- Timestamp formatting

## Data Migration Support

### Local Development Export
```bash
# Export for local development
curl -X GET "http://localhost:5000/api/export-data" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  > local-migration-with-gifts.json
```

### Microservice Import
```bash
# Import to phone update microservice
curl -X POST "http://localhost:3000/import-data" \
  -H "Content-Type: application/json" \
  -d @local-migration-with-gifts.json
```

## Production Testing Checklist

### ✅ Database Integration
- [x] Gift certificates table properly linked to PostgreSQL
- [x] Foreign key relationships with users table maintained
- [x] Proper indexing on certificate codes

### ✅ Admin Functionality
- [x] Authentication required for admin endpoints
- [x] Complete user data with gift certificate details
- [x] Data export includes all certificate information
- [x] Admin dashboard displays real-time certificate status

### ✅ Gift Certificate Lifecycle
- [x] Certificate generation with unique codes
- [x] User redemption process updates database
- [x] Subscription plan upgrades on redemption
- [x] Tracking of redemption timestamps and users

### ✅ Data Export/Import
- [x] Complete data export includes gift certificates
- [x] Export format compatible with migration tools
- [x] Timestamped exports for audit trails
- [x] Import functionality for development environments

## Security Features

### Admin Access Control
- Bearer token authentication for all admin endpoints
- IP logging for admin access attempts
- Comprehensive error handling with stack traces

### Certificate Security
- Unique code generation with collision prevention
- One-time use enforcement in database
- Redemption audit trails with timestamps
- User association tracking

## Monitoring and Logging

### Admin Activity Logging
```
Admin data with gifts fetched for 192.168.1.100
Data with gifts exported for 192.168.1.100
Admin access denied for 10.0.0.1
```

### Certificate Activity Tracking
```
Gift certificate PROF-TEST-ABCD1234 redeemed by user 2 for professional plan
Generated 10 gift certificates for professional plan
```

The gift certificate system is now fully integrated with comprehensive admin tools, data export capabilities, and frontend dashboard management. All existing functionality (Brand Purpose, quota system, OAuth, Google Analytics) has been preserved while adding the new certificate management features.