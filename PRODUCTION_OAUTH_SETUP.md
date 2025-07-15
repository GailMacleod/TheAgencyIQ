# Production OAuth Setup - Replace Placeholder Tokens

## Current Token Status
All platform tokens are placeholders that need OAuth replacement:
- Facebook: `facebook_token_1752409826244` → Real OAuth token needed
- Instagram: `instagram_token_1752409826242` → Real OAuth token needed  
- LinkedIn: `linkedin_token_1752409826240` → Real OAuth token needed
- X: `x_token_1752409826243` → Real OAuth token needed
- YouTube: `direct_youtube_token_1752409429444` → Real OAuth token needed

## Production OAuth URLs
Complete these flows to replace placeholder tokens:

### 1. Facebook & Instagram OAuth
**Production URL**: https://4fc77172-459a-4da7-8c33-5014abb1b73e-00-dqhtnud4ismj.worf.replit.dev/auth/facebook
- Authenticates Facebook account
- Automatically enables Instagram via Facebook Graph API
- Replaces both Facebook and Instagram placeholder tokens

### 2. LinkedIn OAuth  
**Production URL**: https://4fc77172-459a-4da7-8c33-5014abb1b73e-00-dqhtnud4ismj.worf.replit.dev/auth/linkedin
- Authenticates LinkedIn professional account
- Enables business post publishing
- Replaces LinkedIn placeholder token

### 3. X (Twitter) OAuth
**Production URL**: https://4fc77172-459a-4da7-8c33-5014abb1b73e-00-dqhtnud4ismj.worf.replit.dev/auth/twitter
- Authenticates X/Twitter account using OAuth 1.0a
- Enables tweet publishing and engagement
- Replaces X placeholder token

### 4. YouTube OAuth
**Production URL**: https://4fc77172-459a-4da7-8c33-5014abb1b73e-00-dqhtnud4ismj.worf.replit.dev/auth/google
- Authenticates Google account for YouTube access
- Enables video upload and management
- Replaces YouTube placeholder token

## Post-OAuth Verification
After completing all OAuth flows, verify real tokens with:
```bash
node test-real-api-publishing.cjs
```

## Production Deployment Ready
Once OAuth tokens are replaced:
- All 5 platforms will support real API publishing
- 200+ user scalability confirmed
- Session management production-ready
- Quota system operational
- System ready for Queensland SME deployment

## OAuth Completion Order
1. Complete Facebook OAuth (enables Facebook + Instagram)
2. Complete LinkedIn OAuth  
3. Complete X OAuth
4. Complete YouTube OAuth
5. Test real API publishing
6. Deploy to production

System architecture is production-ready - only OAuth token replacement needed.