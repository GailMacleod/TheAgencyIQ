# Facebook App Configuration Update

## Current Issue
Your Facebook app is configured for `app.theagencyiq.ai` but the OAuth system uses the Replit dev URL, causing redirect URI mismatch.

## Required Updates in Facebook Developer Console

### 1. App Domains
**Current:** `app.theagencyiq.ai`
**Add:** `4fc77172-459a-4da7-8c33-5014abb1b73e-00-dqhtnud4ismj.worf.replit.dev`

### 2. Valid OAuth Redirect URIs (Facebook Login > Settings)
**Add:** `https://4fc77172-459a-4da7-8c33-5014abb1b73e-00-dqhtnud4ismj.worf.replit.dev/callback`

### 3. Privacy Policy URL
**Update to:** `https://4fc77172-459a-4da7-8c33-5014abb1b73e-00-dqhtnud4ismj.worf.replit.dev/privacy-policy`

### 4. User Data Deletion
**Update to:** `https://4fc77172-459a-4da7-8c33-5014abb1b73e-00-dqhtnud4ismj.worf.replit.dev/data-deletion`

## Steps to Update
1. Go to Facebook Developer Console
2. Select your app (ID: 1409057863445071)
3. Navigate to Settings > Basic
4. Update App Domains field
5. Go to Products > Facebook Login > Settings
6. Add the new redirect URI
7. Update Privacy Policy and Data Deletion URLs
8. Save all changes

## Test After Update
Once updated, the Facebook OAuth connection should work without redirect URI errors.