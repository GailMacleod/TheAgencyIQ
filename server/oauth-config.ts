import passport from 'passport';
import { Strategy as FacebookStrategy } from 'passport-facebook';
import { Strategy as LinkedInStrategy } from 'passport-linkedin-oauth2';
import { Strategy as TwitterStrategy } from 'passport-twitter';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { storage } from './storage';

const OAUTH_REDIRECT_BASE = process.env.REPLIT_DOMAINS 
  ? `https://${process.env.REPLIT_DOMAINS.split(',')[0]}` 
  : 'http://localhost:5000';

// Facebook OAuth Strategy
passport.use(new FacebookStrategy({
  clientID: process.env.FACEBOOK_APP_ID!,
  clientSecret: process.env.FACEBOOK_APP_SECRET!,
  callbackURL: `${OAUTH_REDIRECT_BASE}/auth/facebook/callback`,
  profileFields: ['id', 'displayName', 'email'],
  passReqToCallback: true
}, async (req: any, accessToken: string, refreshToken: string, profile: any, done: any) => {
  try {
    const userId = req.session.userId;
    if (!userId) {
      return done(new Error('User not authenticated'));
    }

    // Store platform connection
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
    return done(error);
  }
}));

// Instagram OAuth (uses Facebook Graph API)
passport.use('instagram', new FacebookStrategy({
  clientID: process.env.INSTAGRAM_CLIENT_ID!,
  clientSecret: process.env.INSTAGRAM_CLIENT_SECRET!,
  callbackURL: `${OAUTH_REDIRECT_BASE}/auth/instagram/callback`,
  profileFields: ['id', 'displayName'],
  passReqToCallback: true
}, async (req: any, accessToken: string, refreshToken: string, profile: any, done: any) => {
  try {
    const userId = req.session.userId;
    if (!userId) {
      return done(new Error('User not authenticated'));
    }

    await storage.createPlatformConnection({
      userId,
      platform: 'instagram',
      platformUserId: profile.id,
      platformUsername: profile.displayName,
      accessToken,
      refreshToken,
      isActive: true
    });

    return done(null, { platform: 'instagram', success: true });
  } catch (error) {
    return done(error);
  }
}));

// LinkedIn OAuth Strategy
passport.use(new LinkedInStrategy({
  clientID: process.env.LINKEDIN_CLIENT_ID!,
  clientSecret: process.env.LINKEDIN_CLIENT_SECRET!,
  callbackURL: `${OAUTH_REDIRECT_BASE}/auth/linkedin/callback`,
  scope: ['r_liteprofile', 'w_member_social'],
  passReqToCallback: true
}, async (req: any, accessToken: string, refreshToken: string, profile: any, done: any) => {
  try {
    const userId = req.session.userId;
    if (!userId) {
      return done(new Error('User not authenticated'));
    }

    await storage.createPlatformConnection({
      userId,
      platform: 'linkedin',
      platformUserId: profile.id,
      platformUsername: profile.displayName,
      accessToken,
      refreshToken,
      isActive: true
    });

    return done(null, { platform: 'linkedin', success: true });
  } catch (error) {
    return done(error);
  }
}));

// X (Twitter) OAuth Strategy
passport.use(new TwitterStrategy({
  consumerKey: process.env.TWITTER_CLIENT_ID!,
  consumerSecret: process.env.TWITTER_CLIENT_SECRET!,
  callbackURL: `${OAUTH_REDIRECT_BASE}/auth/twitter/callback`,
  passReqToCallback: true
}, async (req: any, token: string, tokenSecret: string, profile: any, done: any) => {
  try {
    const userId = req.session.userId;
    if (!userId) {
      return done(new Error('User not authenticated'));
    }

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
    return done(error);
  }
}));

// YouTube (Google) OAuth Strategy
passport.use('youtube', new GoogleStrategy({
  clientID: process.env.YOUTUBE_CLIENT_ID!,
  clientSecret: process.env.YOUTUBE_CLIENT_SECRET!,
  callbackURL: `${OAUTH_REDIRECT_BASE}/auth/youtube/callback`,
  scope: ['https://www.googleapis.com/auth/youtube.readonly', 'https://www.googleapis.com/auth/youtube.upload'],
  passReqToCallback: true
}, async (req: any, accessToken: string, refreshToken: string, profile: any, done: any) => {
  try {
    const userId = req.session.userId;
    if (!userId) {
      return done(new Error('User not authenticated'));
    }

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
    return done(error);
  }
}));

export { passport };