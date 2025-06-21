const passport = require('passport');
const FacebookStrategy = require('passport-facebook').Strategy;
const LinkedInStrategy = require('passport-linkedin-oauth2').Strategy;
const TwitterStrategy = require('passport-twitter').Strategy;
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const { storage } = require('./storage');
const { db } = require('./db');
const { connections } = require('./models/connection');
const { eq } = require('drizzle-orm');

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

// Facebook Strategy - Production OAuth with publishing permissions
if (process.env.FACEBOOK_APP_ID && process.env.FACEBOOK_APP_SECRET) {
  // Get the correct domain for callback URL
  const domains = process.env.REPLIT_DOMAINS?.split(',') || ['localhost:5000'];
  const domain = domains[0];
  const callbackURL = `https://${domain}/auth/facebook/callback`;
  
  passport.use(new FacebookStrategy({
    clientID: process.env.FACEBOOK_APP_ID,
    clientSecret: process.env.FACEBOOK_APP_SECRET,
    callbackURL: callbackURL,
    profileFields: ['id', 'emails', 'name'],
    scope: ['public_profile', 'pages_show_list', 'pages_manage_posts', 'pages_read_engagement']
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      // Get user phone from session (will be set by route handler)
      const userPhone = profile.userPhone || '+61000000000'; // Fallback
      
      // Create or update platform connection
      const connectionData = {
        userPhone: userPhone,
        platform: 'facebook',
        platformUserId: profile.id,
        accessToken: accessToken,
        refreshToken: refreshToken,
        expiresAt: null, // Facebook tokens don't expire
        isActive: true
      };
      
      // Insert or update connection
      const [connection] = await db
        .insert(connections)
        .values(connectionData)
        .onConflictDoUpdate({
          target: [connections.userPhone, connections.platform],
          set: {
            accessToken: connectionData.accessToken,
            refreshToken: connectionData.refreshToken,
            isActive: true,
            connectedAt: new Date()
          }
        })
        .returning();
      
      console.log(`Token refreshed ${userPhone} for facebook`);
      done(null, { id: profile.id, connection, userPhone });
    } catch (error) {
      console.error('Facebook OAuth error:', error);
      done(error, null);
    }
  }));
} else {
  console.log('Facebook OAuth credentials not available - skipping Facebook strategy');
}

// LinkedIn Strategy
if (process.env.LINKEDIN_CLIENT_ID && process.env.LINKEDIN_CLIENT_SECRET) {
  const domains = process.env.REPLIT_DOMAINS?.split(',') || ['localhost:5000'];
  const domain = domains[0];
  const linkedinCallbackURL = `https://${domain}/auth/linkedin/callback`;
  
  passport.use(new LinkedInStrategy({
    clientID: process.env.LINKEDIN_CLIENT_ID,
    clientSecret: process.env.LINKEDIN_CLIENT_SECRET,
    callbackURL: linkedinCallbackURL,
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

// Twitter Strategy - Fixed authentication
if (process.env.TWITTER_CLIENT_ID && process.env.TWITTER_CLIENT_SECRET) {
  try {
    const domains = process.env.REPLIT_DOMAINS?.split(',') || ['localhost:5000'];
    const domain = domains[0];
    const twitterCallbackURL = `https://${domain}/auth/twitter/callback`;
    
    passport.use(new TwitterStrategy({
      consumerKey: process.env.TWITTER_CLIENT_ID,
      consumerSecret: process.env.TWITTER_CLIENT_SECRET,
      callbackURL: twitterCallbackURL,
      includeEmail: false, // Disable email to avoid permission issues
      userProfileURL: "https://api.twitter.com/1.1/account/verify_credentials.json?include_email=false&skip_status=true"
    },
    async (token, tokenSecret, profile, done) => {
      try {
        console.log('Twitter OAuth profile received:', profile.id, profile.username);
        const connection = await storage.createPlatformConnection({
          userId: profile.id,
          platform: 'x',
          platformUserId: profile.id,
          platformUsername: profile.username || profile.screen_name,
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
    console.log('Twitter OAuth strategy configured successfully');
  } catch (error) {
    console.error('Twitter OAuth strategy setup failed:', error);
  }
} else {
  console.log('Twitter OAuth credentials not available - skipping Twitter strategy');
}

// YouTube (Google) Strategy
if (process.env.YOUTUBE_CLIENT_ID && process.env.YOUTUBE_CLIENT_SECRET) {
  const domains = process.env.REPLIT_DOMAINS?.split(',') || ['localhost:5000'];
  const domain = domains[0];
  const youtubeCallbackURL = `https://${domain}/auth/youtube/callback`;
  
  passport.use(new GoogleStrategy({
    clientID: process.env.YOUTUBE_CLIENT_ID,
    clientSecret: process.env.YOUTUBE_CLIENT_SECRET,
    callbackURL: youtubeCallbackURL
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