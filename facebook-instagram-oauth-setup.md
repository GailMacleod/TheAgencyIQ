# Facebook & Instagram OAuth Setup Guide

## Facebook App Configuration

### Domains and Valid OAuth Redirect URLs

#### 1. App Domains
Add these domains in **Settings > Basic > App Domains**:
```
app.theagencyiq.ai
workspace.GailMac.repl.co
```

#### 2. Valid OAuth Redirect URIs
Add these URLs in **Products > Facebook Login > Settings > Valid OAuth Redirect URIs**:
```
https://app.theagencyiq.ai/callback
https://workspace.GailMac.repl.co/callback
```

#### 3. Instagram API Setup
In **Products > Instagram > Basic Display > Instagram App Settings**:
- Valid OAuth Redirect URIs:
```
https://app.theagencyiq.ai/callback
https://workspace.GailMac.repl.co/callback
```

### Required Permissions

#### Facebook Login Permissions:
- `public_profile` (default)
- `pages_show_list`
- `pages_manage_posts`
- `pages_read_engagement`
- `publish_actions` (legacy)

#### Instagram Basic Display Permissions:
- `instagram_basic`
- `instagram_content_publish`
- `user_profile`
- `user_media`

## OAuth Flow Configuration

### Current OAuth Endpoints:
- **Facebook**: Uses Facebook Graph API v18.0
- **Instagram**: Uses Facebook Graph API v18.0 (unified system)

### Authorization URLs:
```
Facebook: https://www.facebook.com/v18.0/dialog/oauth
Instagram: https://www.facebook.com/v18.0/dialog/oauth (same endpoint, different scopes)
```

### Token Exchange:
```
Endpoint: https://graph.facebook.com/v20.0/oauth/access_token
Method: POST
Content-Type: application/x-www-form-urlencoded
```

## App Credentials (Facebook App ID: 1409057863445071)

### Environment Variables Required:
```
FACEBOOK_APP_ID=1409057863445071
FACEBOOK_APP_SECRET=[Your App Secret]
INSTAGRAM_APP_ID=1409057863445071 (same as Facebook)
INSTAGRAM_APP_SECRET=[Same as Facebook App Secret]
```

## Implementation Status
✅ OAuth endpoints configured in server/index.ts
✅ Universal callback handler implemented
✅ Database integration ready for token storage
⚠️ Requires Facebook Developer Console configuration update

## Next Steps
1. Add redirect URIs to Facebook app settings
2. Enable Instagram Basic Display product
3. Configure Instagram OAuth redirect URIs
4. Test both Facebook and Instagram connections