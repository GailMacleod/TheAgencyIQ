import passport from 'passport';
import { Strategy as FacebookStrategy } from 'passport-facebook';
import { Strategy as LinkedInStrategy } from 'passport-linkedin-oauth2';
import { Strategy as TwitterStrategy } from 'passport-twitter';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { db } from './db.js';
import { connections } from './models/connection.js';

// OAuth configuration for all platforms
const oauthConfig = {
  facebook: {
    clientID: process.env.FACEBOOK_APP_ID,
    clientSecret: process.env.FACEBOOK_APP_SECRET,
    callbackURL: "/auth/facebook/callback",
    scope: ['public_profile', 'pages_show_list', 'pages_manage_posts', 'pages_read_engagement']
  },
  linkedin: {
    clientID: process.env.LINKEDIN_CLIENT_ID,
    clientSecret: process.env.LINKEDIN_CLIENT_SECRET,
    callbackURL: "/auth/linkedin/callback",
    scope: ['r_liteprofile', 'w_member_social']
  },
  twitter: {
    consumerKey: process.env.TWITTER_CLIENT_ID,
    consumerSecret: process.env.TWITTER_CLIENT_SECRET,
    callbackURL: "/auth/twitter/callback",
    scope: ['tweet.read', 'tweet.write', 'users.read']
  },
  youtube: {
    clientID: process.env.YOUTUBE_CLIENT_ID,
    clientSecret: process.env.YOUTUBE_CLIENT_SECRET,
    callbackURL: "/auth/youtube/callback",
    scope: ['https://www.googleapis.com/auth/youtube']
  },
  instagram: {
    clientID: process.env.INSTAGRAM_CLIENT_ID,
    clientSecret: process.env.INSTAGRAM_CLIENT_SECRET,
    callbackURL: "/auth/instagram/callback",
    scope: ['instagram_basic', 'pages_show_list', 'pages_manage_posts']
  }
};

// Initialize passport strategies
function initializeOAuth() {
  console.log('OAuth configured facebook');
  passport.use(new FacebookStrategy({
    clientID: oauthConfig.facebook.clientID,
    clientSecret: oauthConfig.facebook.clientSecret,
    callbackURL: oauthConfig.facebook.callbackURL,
    profileFields: ['id', 'displayName', 'email']
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      const userPhone = '+61411223344'; // Default phone for OAuth sessions
      
      await db.insert(connections).values({
        userPhone,
        platform: 'facebook',
        platformUserId: profile.id,
        accessToken,
        refreshToken,
        expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days
        isActive: true
      }).onConflictDoUpdate({
        target: [connections.userPhone, connections.platform],
        set: {
          accessToken,
          refreshToken,
          expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
          isActive: true,
          connectedAt: new Date()
        }
      });
      
      console.log(`Facebook connected for ${userPhone}`);
      return done(null, { platform: 'facebook', userPhone, profile });
    } catch (error) {
      console.error('Facebook OAuth error:', error);
      return done(error);
    }
  }));

  console.log('OAuth configured linkedin');
  passport.use(new LinkedInStrategy({
    clientID: oauthConfig.linkedin.clientID,
    clientSecret: oauthConfig.linkedin.clientSecret,
    callbackURL: oauthConfig.linkedin.callbackURL,
    scope: oauthConfig.linkedin.scope
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      const userPhone = '+61411223344';
      
      await db.insert(connections).values({
        userPhone,
        platform: 'linkedin',
        platformUserId: profile.id,
        accessToken,
        refreshToken,
        expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
        isActive: true
      }).onConflictDoUpdate({
        target: [connections.userPhone, connections.platform],
        set: {
          accessToken,
          refreshToken,
          expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
          isActive: true,
          connectedAt: new Date()
        }
      });
      
      console.log(`LinkedIn connected for ${userPhone}`);
      return done(null, { platform: 'linkedin', userPhone, profile });
    } catch (error) {
      console.error('LinkedIn OAuth error:', error);
      return done(error);
    }
  }));

  console.log('OAuth configured twitter');
  passport.use(new TwitterStrategy({
    consumerKey: oauthConfig.twitter.consumerKey,
    consumerSecret: oauthConfig.twitter.consumerSecret,
    callbackURL: oauthConfig.twitter.callbackURL
  }, async (token, tokenSecret, profile, done) => {
    try {
      const userPhone = '+61411223344';
      
      await db.insert(connections).values({
        userPhone,
        platform: 'x',
        platformUserId: profile.id,
        accessToken: token,
        refreshToken: tokenSecret,
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // Twitter tokens don't expire
        isActive: true
      }).onConflictDoUpdate({
        target: [connections.userPhone, connections.platform],
        set: {
          accessToken: token,
          refreshToken: tokenSecret,
          expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          isActive: true,
          connectedAt: new Date()
        }
      });
      
      console.log(`Twitter connected for ${userPhone}`);
      return done(null, { platform: 'x', userPhone, profile });
    } catch (error) {
      console.error('Twitter OAuth error:', error);
      return done(error);
    }
  }));

  console.log('OAuth configured youtube');
  passport.use('google-youtube', new GoogleStrategy({
    clientID: oauthConfig.youtube.clientID,
    clientSecret: oauthConfig.youtube.clientSecret,
    callbackURL: oauthConfig.youtube.callbackURL,
    scope: oauthConfig.youtube.scope
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      const userPhone = '+61411223344';
      
      await db.insert(connections).values({
        userPhone,
        platform: 'youtube',
        platformUserId: profile.id,
        accessToken,
        refreshToken,
        expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
        isActive: true
      }).onConflictDoUpdate({
        target: [connections.userPhone, connections.platform],
        set: {
          accessToken,
          refreshToken,
          expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
          isActive: true,
          connectedAt: new Date()
        }
      });
      
      console.log(`YouTube connected for ${userPhone}`);
      return done(null, { platform: 'youtube', userPhone, profile });
    } catch (error) {
      console.error('YouTube OAuth error:', error);
      return done(error);
    }
  }));

  console.log('OAuth configured instagram');
  // Instagram uses Facebook's OAuth with specific scopes
  passport.use('facebook-instagram', new FacebookStrategy({
    clientID: oauthConfig.instagram.clientID || oauthConfig.facebook.clientID,
    clientSecret: oauthConfig.instagram.clientSecret || oauthConfig.facebook.clientSecret,
    callbackURL: oauthConfig.instagram.callbackURL,
    profileFields: ['id', 'displayName', 'email']
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      const userPhone = '+61411223344';
      
      await db.insert(connections).values({
        userPhone,
        platform: 'instagram',
        platformUserId: profile.id,
        accessToken,
        refreshToken,
        expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
        isActive: true
      }).onConflictDoUpdate({
        target: [connections.userPhone, connections.platform],
        set: {
          accessToken,
          refreshToken,
          expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
          isActive: true,
          connectedAt: new Date()
        }
      });
      
      console.log(`Instagram connected for ${userPhone}`);
      return done(null, { platform: 'instagram', userPhone, profile });
    } catch (error) {
      console.error('Instagram OAuth error:', error);
      return done(error);
    }
  }));

  passport.serializeUser((user, done) => {
    done(null, user);
  });

  passport.deserializeUser((user, done) => {
    done(null, user);
  });
}

export {
  oauthConfig,
  initializeOAuth
};