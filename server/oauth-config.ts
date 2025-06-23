import passport from 'passport';
import { Strategy as FacebookStrategy } from 'passport-facebook';
import { Strategy as LinkedInStrategy } from 'passport-linkedin-oauth2';
import { Strategy as TwitterStrategy } from 'passport-twitter';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { storage } from './storage';

const OAUTH_REDIRECT_BASE = process.env.REPLIT_DOMAINS 
  ? `https://${process.env.REPLIT_DOMAINS.split(',')[0]}` 
  : 'http://localhost:5000';

// Facebook OAuth Strategy with proper page permissions
passport.use(new FacebookStrategy({
  clientID: process.env.FACEBOOK_APP_ID!,
  clientSecret: process.env.FACEBOOK_APP_SECRET!,
  callbackURL: `${OAUTH_REDIRECT_BASE}/auth/facebook/callback`,
  profileFields: ['id', 'displayName', 'email'],
  scope: ['email', 'pages_manage_posts', 'pages_read_engagement', 'publish_to_groups', 'pages_show_list', 'user_posts', 'publish_actions'],
  passReqToCallback: true
}, async (req: any, accessToken: string, refreshToken: string, profile: any, done: any) => {
  try {
    const userId = req.session.userId;
    if (!userId) {
      return done(new Error('User not authenticated'));
    }

    // Validate real OAuth token (no demo/mock tokens allowed)
    if (!accessToken || accessToken.includes('demo') || accessToken.includes('mock') || accessToken.length < 10) {
      return done(new Error('Invalid Facebook OAuth token received'));
    }

    console.log('Facebook OAuth successful:', {
      profileId: profile.id,
      displayName: profile.displayName,
      tokenType: 'live_oauth'
    });

    // Store platform connection with real credentials only
    await storage.createPlatformConnection({
      userId,
      platform: 'facebook',
      platformUserId: profile.id,
      platformUsername: profile.displayName,
      accessToken,
      refreshToken,
      isActive: true
    });

    return done(null, { platform: 'facebook', success: true });
  } catch (error) {
    console.error('Facebook OAuth error:', error);
    return done(error);
  }
}));

// Instagram - Direct connection method (OAuth disabled due to app configuration issues)
// Instagram connections are now handled via direct API endpoints in routes.ts

// LinkedIn OAuth Strategy
passport.use(new LinkedInStrategy({
  clientID: process.env.LINKEDIN_CLIENT_ID!,
  clientSecret: process.env.LINKEDIN_CLIENT_SECRET!,
  callbackURL: `${OAUTH_REDIRECT_BASE}/auth/linkedin/callback`,
  scope: ['profile', 'w_member_social', 'email'],
  passReqToCallback: true
}, async (req: any, accessToken: string, refreshToken: string, profile: any, done: any) => {
  try {
    console.log('LinkedIn OAuth callback received:', {
      profileId: profile.id,
      displayName: profile.displayName,
      sessionUserId: req.session?.userId,
      hasAccessToken: !!accessToken
    });

    // For LinkedIn OAuth, we need to find the user differently since session might be lost
    let userId = req.session?.userId;
    
    // If no session userId, try to find user by email from profile
    if (!userId && profile.emails && profile.emails[0]) {
      const user = await storage.getUserByEmail(profile.emails[0].value);
      if (user) {
        userId = user.id;
        req.session.userId = userId; // Restore session
        req.session.save(); // Ensure session is persisted
      }
    }

    // Try one more recovery attempt using any available user identifier
    if (!userId && profile.id) {
      // Skip platform connection lookup for now - focus on session recovery
      console.log('LinkedIn OAuth: Could not recover user session for profile ID:', profile.id);
    }

    if (!userId) {
      console.error('LinkedIn OAuth: No user session found and cannot recover');
      return done(new Error('User session lost during OAuth - please log in again'));
    }

    // Validate real OAuth token (no demo/mock tokens allowed)
    if (!accessToken || accessToken.includes('demo') || accessToken.includes('mock') || accessToken.length < 10) {
      return done(new Error('Invalid LinkedIn OAuth token received'));
    }

    console.log('LinkedIn OAuth successful:', {
      profileId: profile.id,
      displayName: profile.displayName,
      userId: userId,
      tokenType: 'live_oauth'
    });

    await storage.createPlatformConnection({
      userId,
      platform: 'linkedin',
      platformUserId: profile.id,
      platformUsername: profile.displayName || profile.name?.givenName + ' ' + profile.name?.familyName,
      accessToken,
      refreshToken: refreshToken || null,
      isActive: true
    });

    return done(null, { platform: 'linkedin', success: true });
  } catch (error) {
    console.error('LinkedIn OAuth error:', error);
    return done(error);
  }
}));

// X (Twitter) OAuth Strategy
passport.use(new TwitterStrategy({
  consumerKey: process.env.X_0AUTH_CLIENT_ID!,
  consumerSecret: process.env.X_0AUTH_CLIENT_SECRET!,
  callbackURL: `${OAUTH_REDIRECT_BASE}/auth/twitter/callback`,
  userProfileURL: "https://api.twitter.com/1.1/account/verify_credentials.json?include_email=true",
  passReqToCallback: true
}, async (req: any, token: string, tokenSecret: string, profile: any, done: any) => {
  try {
    const userId = req.session.userId;
    if (!userId) {
      return done(new Error('User not authenticated'));
    }

    // Validate real OAuth token (no demo/mock tokens allowed)
    if (!token || token.includes('demo') || token.includes('mock') || token.length < 10) {
      return done(new Error('Invalid X OAuth token received'));
    }

    console.log('X OAuth successful:', {
      profileId: profile.id,
      username: profile.username,
      tokenType: 'live_oauth'
    });

    await storage.createPlatformConnection({
      userId,
      platform: 'x',
      platformUserId: profile.id,
      platformUsername: profile.username,
      accessToken: token,
      refreshToken: tokenSecret,
      isActive: true
    });

    return done(null, { platform: 'x', success: true });
  } catch (error) {
    console.error('X OAuth error:', error);
    return done(error);
  }
}));

// YouTube (Google) OAuth Strategy
passport.use('youtube', new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID!,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
  callbackURL: `${OAUTH_REDIRECT_BASE}/auth/youtube/callback`,
  scope: ['https://www.googleapis.com/auth/youtube.readonly', 'https://www.googleapis.com/auth/youtube.upload'],
  passReqToCallback: true
}, async (req: any, accessToken: string, refreshToken: string, profile: any, done: any) => {
  try {
    const userId = req.session.userId;
    if (!userId) {
      return done(new Error('User not authenticated'));
    }

    // Validate real OAuth token (no demo/mock tokens allowed)
    if (!accessToken || accessToken.includes('demo') || accessToken.includes('mock') || accessToken.length < 10) {
      return done(new Error('Invalid YouTube OAuth token received'));
    }

    console.log('YouTube OAuth successful:', {
      profileId: profile.id,
      displayName: profile.displayName,
      tokenType: 'live_oauth'
    });

    await storage.createPlatformConnection({
      userId,
      platform: 'youtube',
      platformUserId: profile.id,
      platformUsername: profile.displayName,
      accessToken,
      refreshToken,
      isActive: true
    });

    return done(null, { platform: 'youtube', success: true });
  } catch (error) {
    console.error('YouTube OAuth error:', error);
    return done(error);
  }
}));

export { passport };