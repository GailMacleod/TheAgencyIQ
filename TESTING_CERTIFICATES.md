# AgencyIQ Testing Certificates - Professional Plan

## Overview
These gift certificates are generated from an actual Professional plan purchase ($10 value each) and provide authentic Professional plan access for testing purposes.

## Testing Instructions

### Step 1: Create Test Account
1. Navigate to the AgencyIQ signup page
2. Create account with credentials:
   - Email: testuser@agencyiq.com
   - Password: TestPass123!
   - Phone: +15005550006 (test number)

### Step 2: Redeem Gift Certificate
After logging in, make a POST request to `/api/redeem-gift-certificate` with one of these codes:

## Available Gift Certificates (Professional Plan - 50 Posts)

1. **PROF-TEST-QCNRLSMA** - Unused
2. **PROF-TEST-I0M486C5** - Unused  
3. **PROF-TEST-SZ1YHBJZ** - Unused
4. **PROF-TEST-UZ39HC78** - Unused
5. **PROF-TEST-FW74ISW2** - Unused
6. **PROF-TEST-01ZMGVTY** - Unused
7. **PROF-TEST-V9MCYLEW** - Unused
8. **PROF-TEST-FEHQ352F** - Unused
9. **PROF-TEST-GPGCYYWQ** - Unused
10. **PROF-TEST-VJBXN7FE** - Unused

## Redemption Example
```bash
curl -X POST http://localhost:5000/api/redeem-gift-certificate \
  -H "Content-Type: application/json" \
  -H "Cookie: connect.sid=YOUR_SESSION_COOKIE" \
  -d '{"code": "PROF-TEST-QCNRLSMA"}'
```

## What You Get
- **Plan**: Professional
- **Posts**: 50 remaining out of 52 total
- **Features**: Full access to all AgencyIQ functionality
- **Content Generation**: Full access to Grok AI scheduling
- **Platform Connections**: Unlimited social media platform connections

## Testing Focus Areas
Once redeemed, test these key features:

### 1. Content Generation (14/29/54 posts)
- Test generating 14 posts (starter equivalent)
- Test generating 29 posts (growth equivalent) 
- Test generating 54 posts (beyond professional limit for stress testing)

### 2. Schedule Page Testing
- Navigate to `/schedule` page
- Verify post generation works correctly
- Test platform-specific content optimization
- Verify post limits are enforced properly

### 3. Brand Purpose Integration
- Complete brand purpose setup if not done
- Verify autofill functionality works
- Test Grok integration with brand data

## Technical Notes
- Each certificate is one-time use only
- Certificates are tied to the actual Professional plan purchase
- All data generated is authentic, not synthetic
- Post limits and features match real subscription behavior

## Meta Submission Update
After testing, update reviews with:
"Log in as a new account (testuser@agencyiq.com with TestPass123!), redeem certificate PROF-TEST-[CODE] at /api/redeem-gift-certificate, test 14/29/54 posts on the schedule page."

## Support
If any certificate fails to redeem or provides incorrect access, contact support with the specific certificate code used.