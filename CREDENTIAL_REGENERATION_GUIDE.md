# Platform Credential Regeneration Guide
## Critical for 9:00 AM JST Launch

### Facebook Platform
**Status:** Page Access Token Expired (June 22, 2025)
**Required Action:** Generate new Page Access Token

1. Go to [Facebook Developers Console](https://developers.facebook.com/)
2. Select your app: "TheAgencyIQ"
3. Navigate to Tools > Graph API Explorer
4. Select your Facebook Page from dropdown
5. Add permissions: `pages_manage_posts`, `pages_show_list`, `pages_read_engagement`
6. Generate Access Token
7. Copy the token and add to Replit Secrets as `FACEBOOK_PAGE_ACCESS_TOKEN`

**Test Command:** `curl -X GET "https://graph.facebook.com/v20.0/me?access_token=YOUR_TOKEN"`

---

### LinkedIn Platform
**Status:** Access Token Revoked by User
**Required Action:** Regenerate LinkedIn Access Token

1. Go to [LinkedIn Developer Portal](https://www.linkedin.com/developers/)
2. Select your app: "TheAgencyIQ"
3. Navigate to Auth tab
4. Use OAuth 2.0 Authorization Code Flow
5. Required scopes: `w_member_social`, `r_liteprofile`, `r_emailaddress`
6. Authorization URL: `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=YOUR_CLIENT_ID&redirect_uri=YOUR_REDIRECT&scope=w_member_social%20r_liteprofile%20r_emailaddress`
7. Exchange authorization code for access token
8. Add to Replit Secrets as `LINKEDIN_ACCESS_TOKEN`

**Test Command:** `curl -X GET "https://api.linkedin.com/v2/me" -H "Authorization: Bearer YOUR_TOKEN"`

---

### Instagram Platform
**Status:** Invalid OAuth Access Token
**Required Action:** Generate Instagram Business API Token

1. Go to [Facebook Developers Console](https://developers.facebook.com/)
2. Navigate to Instagram Basic Display or Instagram Graph API
3. Ensure your Facebook Page is connected to Instagram Business Account
4. Generate User Access Token with `instagram_basic` permissions
5. Exchange for Page Access Token if using Instagram Graph API
6. Add to Replit Secrets as `INSTAGRAM_ACCESS_TOKEN`

**Test Command:** `curl -X GET "https://graph.instagram.com/me?access_token=YOUR_TOKEN"`

---

### X Platform (Twitter)
**Status:** OAuth 1.0a Authentication Failed
**Required Action:** Regenerate X API Credentials

1. Go to [X Developer Portal](https://developer.twitter.com/)
2. Select your app: "TheAgencyIQ"
3. Navigate to Keys and Tokens
4. Regenerate Access Token and Secret with Read and Write permissions
5. Ensure OAuth 1.0a is enabled
6. Copy both Access Token and Access Token Secret
7. Add to Replit Secrets:
   - `X_ACCESS_TOKEN`
   - `X_ACCESS_TOKEN_SECRET`

**Test Command:** Use OAuth 1.0a signature to test `https://api.twitter.com/1.1/account/verify_credentials.json`

---

## Critical Notes

1. **All tokens expired between June 22-23, 2025**
2. **Zero operational platforms currently**
3. **Launch readiness: 0%**
4. **Immediate action required for 9:00 AM JST launch**

## Verification Commands

After regenerating each credential, run:
```bash
node launch-readiness-complete-test.js
```

Target: 75%+ platform readiness for launch approval.