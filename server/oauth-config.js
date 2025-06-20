const passport = require('passport');
const FacebookStrategy = require('passport-facebook').Strategy;
const LinkedInStrategy = require('passport-linkedin-oauth2').Strategy;
const TwitterStrategy = require('passport-twitter').Strategy;
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const { storage } = require('./storage');

// Serialize user for session
passport.serializeUser((user, done) => {
  done(null, user.id);
});

// Deserialize user from session
passport.deserializeUser(async (id, done) => {
  try {
    const user = await storage.getUser(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

// Facebook Strategy
if (process.env.FACEBOOK_APP_ID && process.env.FACEBOOK_APP_SECRET) {
  passport.use(new FacebookStrategy({
    clientID: process.env.FACEBOOK_APP_ID,
    clientSecret: process.env.FACEBOOK_APP_SECRET,
    callbackURL: "/auth/facebook/callback",
    profileFields: ['id', 'emails', 'name']
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      // Find or create platform connection
      const connection = await storage.createPlatformConnection({
        userId: profile._json.id, // This will be updated with session userId
        platform: 'facebook',
        platformUserId: profile.id,
        platformUsername: profile.displayName || profile.username,
        accessToken: accessToken,
        refreshToken: refreshToken,
        expiresAt: null,
        isActive: true
      });
      
      console.log('Facebook OAuth successful:', profile.id);
      done(null, { id: profile.id, connection });
    } catch (error) {
      console.error('Facebook OAuth error:', error);
      done(error, null);
    }
  }));
}

// LinkedIn Strategy
if (process.env.LINKEDIN_CLIENT_ID && process.env.LINKEDIN_CLIENT_SECRET) {
  passport.use(new LinkedInStrategy({
    clientID: process.env.LINKEDIN_CLIENT_ID,
    clientSecret: process.env.LINKEDIN_CLIENT_SECRET,
    callbackURL: "/auth/linkedin/callback",
    scope: ['profile', 'email', 'w_member_social'],
    state: true
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      console.log('LinkedIn OAuth profile received:', profile.id, profile.displayName);
      const connection = await storage.createPlatformConnection({
        userId: profile.id, // This will be updated with session userId
        platform: 'linkedin',
        platformUserId: profile.id,
        platformUsername: profile.displayName || profile.name?.localized?.en_US || 'LinkedIn User',
        accessToken: accessToken,
        refreshToken: refreshToken,
        expiresAt: null,
        isActive: true
      });
      
      console.log('LinkedIn OAuth successful:', profile.id);
      done(null, { id: profile.id, connection });
    } catch (error) {
      console.error('LinkedIn OAuth error:', error);
      done(error, null);
    }
  }));
} else {
  console.log('LinkedIn OAuth credentials not available - skipping LinkedIn strategy');
}

// Twitter Strategy - Enhanced error handling
if (process.env.TWITTER_CLIENT_ID && process.env.TWITTER_CLIENT_SECRET) {
  passport.use(new TwitterStrategy({
    consumerKey: process.env.TWITTER_CLIENT_ID,
    consumerSecret: process.env.TWITTER_CLIENT_SECRET,
    callbackURL: "/auth/twitter/callback",
    includeEmail: true
  },
  async (token, tokenSecret, profile, done) => {
    try {
      console.log('Twitter OAuth profile received:', profile.id, profile.username);
      const connection = await storage.createPlatformConnection({
        userId: profile.id, // This will be updated with session userId
        platform: 'x',
        platformUserId: profile.id,
        platformUsername: profile.username,
        accessToken: token,
        refreshToken: tokenSecret,
        expiresAt: null,
        isActive: true
      });
      
      console.log('Twitter OAuth successful:', profile.id);
      done(null, { id: profile.id, connection });
    } catch (error) {
      console.error('Twitter OAuth storage error:', error);
      done(error, null);
    }
  }));
} else {
  console.log('Twitter OAuth credentials not available - skipping Twitter strategy');
}

// YouTube (Google) Strategy
if (process.env.YOUTUBE_CLIENT_ID && process.env.YOUTUBE_CLIENT_SECRET) {
  passport.use(new GoogleStrategy({
    clientID: process.env.YOUTUBE_CLIENT_ID,
    clientSecret: process.env.YOUTUBE_CLIENT_SECRET,
    callbackURL: "/auth/youtube/callback"
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      const connection = await storage.createPlatformConnection({
        userId: profile.id, // This will be updated with session userId
        platform: 'youtube',
        platformUserId: profile.id,
        platformUsername: profile.displayName,
        accessToken: accessToken,
        refreshToken: refreshToken,
        expiresAt: null,
        isActive: true
      });
      
      console.log('YouTube OAuth successful:', profile.id);
      done(null, { id: profile.id, connection });
    } catch (error) {
      console.error('YouTube OAuth error:', error);
      done(error, null);
    }
  }));
}

module.exports = { passport };