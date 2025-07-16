-- Setup OAuth Environment Configuration
-- This script provides the environment variables needed for OAuth integration

-- You'll need to set these environment variables in your .env file:

-- Facebook OAuth
-- FACEBOOK_CLIENT_ID=your_facebook_app_id
-- FACEBOOK_CLIENT_SECRET=your_facebook_app_secret

-- Instagram OAuth (uses Facebook Graph API)
-- INSTAGRAM_CLIENT_ID=your_instagram_app_id
-- INSTAGRAM_CLIENT_SECRET=your_instagram_app_secret

-- LinkedIn OAuth
-- LINKEDIN_CLIENT_ID=your_linkedin_client_id
-- LINKEDIN_CLIENT_SECRET=your_linkedin_client_secret

-- Twitter OAuth 2.0
-- TWITTER_CLIENT_ID=your_twitter_client_id
-- TWITTER_CLIENT_SECRET=your_twitter_client_secret

-- YouTube OAuth (uses Google OAuth)
-- YOUTUBE_CLIENT_ID=your_google_client_id
-- YOUTUBE_CLIENT_SECRET=your_google_client_secret

-- Base URL for OAuth callbacks
-- BASE_URL=https://your-app-domain.com

-- JWT Secret for token encryption
-- JWT_SECRET=your-secure-jwt-secret-key

-- Example .env configuration:
/*
FACEBOOK_CLIENT_ID=123456789012345
FACEBOOK_CLIENT_SECRET=abc123def456ghi789jkl012mno345pqr

INSTAGRAM_CLIENT_ID=123456789012345
INSTAGRAM_CLIENT_SECRET=abc123def456ghi789jkl012mno345pqr

LINKEDIN_CLIENT_ID=78abcdef123456
LINKEDIN_CLIENT_SECRET=AbCdEfGhIjKlMnOpQrStUvWxYz123456

TWITTER_CLIENT_ID=T1a2B3c4D5e6F7g8H9i0
TWITTER_CLIENT_SECRET=X1y2Z3a4B5c6D7e8F9g0H1i2J3k4L5m6N7o8P9q0R1s2T3u4V5w6X7y8Z9a0B1c2

YOUTUBE_CLIENT_ID=123456789012-abcdefghijklmnopqrstuvwxyz123456.apps.googleusercontent.com
YOUTUBE_CLIENT_SECRET=GOCSPX-abcdefghijklmnopqrstuvwxyz123456

BASE_URL=https://your-app.replit.app
JWT_SECRET=your-super-secure-jwt-secret-minimum-32-characters
*/

-- OAuth Platform Setup Instructions:

-- FACEBOOK:
-- 1. Go to https://developers.facebook.com/
-- 2. Create a new app or use existing
-- 3. Add Facebook Login product
-- 4. Set Valid OAuth Redirect URIs to: https://your-app.replit.app/api/oauth/callback/facebook
-- 5. Add required permissions: pages_manage_posts, pages_read_engagement, public_profile

-- INSTAGRAM:
-- 1. Instagram uses Facebook Graph API
-- 2. In your Facebook app, add Instagram Basic Display
-- 3. Set Valid OAuth Redirect URIs to: https://your-app.replit.app/api/oauth/callback/instagram
-- 4. Add required permissions: user_profile, user_media

-- LINKEDIN:
-- 1. Go to https://www.linkedin.com/developers/
-- 2. Create a new app
-- 3. Add Sign In with LinkedIn and Marketing API products
-- 4. Set Authorized redirect URLs to: https://your-app.replit.app/api/oauth/callback/linkedin
-- 5. Add required permissions: r_liteprofile, w_member_social

-- TWITTER:
-- 1. Go to https://developer.twitter.com/
-- 2. Create a new app or use existing
-- 3. Enable OAuth 2.0 with PKCE
-- 4. Set Callback URLs to: https://your-app.replit.app/api/oauth/callback/twitter
-- 5. Add required permissions: tweet.read, tweet.write, users.read, offline.access

-- YOUTUBE:
-- 1. Go to https://console.cloud.google.com/
-- 2. Create a new project or use existing
-- 3. Enable YouTube Data API v3
-- 4. Create OAuth 2.0 credentials
-- 5. Set Authorized redirect URIs to: https://your-app.replit.app/api/oauth/callback/youtube
-- 6. Add required scopes: https://www.googleapis.com/auth/youtube.upload

-- Database Setup:
-- Run the create-oauth-tables.sql script to create the required tables