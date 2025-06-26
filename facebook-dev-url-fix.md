# URGENT: Facebook OAuth Development URL Fix

## Problem
Facebook OAuth is failing with "URL blocked" error because your development URL is not whitelisted in Facebook app configuration.

## Current URLs
- **Production:** https://app.theagencyiq.ai/callback ✓ (already configured)
- **Development:** https://workspace.GailMac.repl.co/callback ❌ (needs to be added)

## IMMEDIATE FIX REQUIRED

### Step 1: Facebook Developer Console
1. Go to https://developers.facebook.com/apps/1409057863445071
2. Navigate to **Products > Facebook Login > Settings**
3. In **Valid OAuth Redirect URIs**, add:
   ```
   https://workspace.GailMac.repl.co/callback
   ```
4. Click **Save Changes**

### Step 2: App Domains
1. Go to **Settings > Basic**
2. In **App Domains**, add:
   ```
   workspace.GailMac.repl.co
   ```
3. Click **Save Changes**

### Step 3: Test
After saving both changes, try the Facebook connection again. The OAuth flow should work immediately.

## Result
Both production and development environments will work seamlessly with Facebook OAuth.