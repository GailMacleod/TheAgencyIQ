# LinkedIn Access Token Generation

## Current Status
- Facebook: ✅ Token working, needs business page
- LinkedIn: ❌ Token revoked, needs new token with permissions

## Generate LinkedIn Token (3 Steps)

### Step 1: Authorization
Visit this URL to authorize the LinkedIn app:
```
https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=86rso45pajc7wj&redirect_uri=https%3A%2F%2Fapp.theagencyiq.ai%2Fapi%2Foauth%2Flinkedin%2Fcallback&scope=r_liteprofile+w_member_social&state=token_generation
```

### Step 2: Get Authorization Code
After clicking "Allow", LinkedIn redirects to:
```
https://app.theagencyiq.ai/api/oauth/linkedin/callback?code=AUTHORIZATION_CODE&state=token_generation
```
Copy the `code=` value from this URL.

### Step 3: Exchange for Access Token
Run this curl command (replace YOUR_AUTHORIZATION_CODE):
```bash
curl -X POST 'https://www.linkedin.com/oauth/v2/accessToken' \
     -H 'Content-Type: application/x-www-form-urlencoded' \
     -d 'grant_type=authorization_code' \
     -d 'code=YOUR_AUTHORIZATION_CODE' \
     -d 'redirect_uri=https://app.theagencyiq.ai/api/oauth/linkedin/callback' \
     -d 'client_id=86rso45pajc7wj' \
     -d 'client_secret=WPL_AP1.dc5CSuDbf7p4gRog.FD8jRg=='
```

### Step 4: Add Token to Secrets
Copy the `access_token` from the response and add it to Replit Secrets as:
- Key: `LINKEDIN_ACCESS_TOKEN`
- Value: The access token (starts with "AQV")

## Test Token
Verify the token works:
```bash
curl -H "Authorization: Bearer YOUR_ACCESS_TOKEN" https://api.linkedin.com/v2/me
```

## Current Publishing Status
- **Facebook**: Ready (needs business page setup)
- **LinkedIn**: Waiting for new token
- **Twitter/Instagram**: Requires additional OAuth setup

Once you complete the LinkedIn token generation, both Facebook and LinkedIn publishing will be operational.