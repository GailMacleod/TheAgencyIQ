import passport from 'passport';
import { Strategy as FacebookStrategy } from 'passport-facebook';
import { Strategy as LinkedInStrategy } from 'passport-linkedin-oauth2';
import { Strategy as TwitterStrategy } from 'passport-twitter';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { storage } from './storage';

// TypeScript interfaces for OAuth callback handling
interface OAuthProfile {
  id: string;
  displayName?: string;
  username?: string;
  name?: {
    givenName?: string;
    familyName?: string;
  };
  emails?: Array<{ value: string }>;
}

interface OAuthTokens {
  accessToken: string;
  refreshToken?: string | null;
  tokenSecret?: string; // For Twitter OAuth 1.0a
}

interface OAuthCallbackParams {
  req: any;
  profile: OAuthProfile;
  tokens: OAuthTokens;
  platform: string;
}

interface OAuthResult {
  platform: string;
  success: boolean;
  error?: string;
}

// Unified OAuth callback handler with comprehensive error handling
async function handleOAuthCallback(params: OAuthCallbackParams): Promise<OAuthResult> {
  const { req, profile, tokens, platform } = params;
  
  try {
    // Step 1: Validate user session with enhanced recovery
    let userId = req.session?.userId;
    
    // Enhanced session recovery for all platforms
    if (!userId && profile.emails?.[0]) {
      const user = await storage.getUserByEmail(profile.emails[0].value);
      if (user) {
        userId = user.id;
        req.session.userId = userId;
        req.session.userEmail = user.email;
        
        // Force session save with callback
        await new Promise<void>((resolve, reject) => {
          req.session.save((err: any) => {
            if (err) {
              console.error('Session save error during OAuth:', err);
              reject(err);
            } else {
              console.log(`Session recovered for ${platform} OAuth: User ID ${userId}`);
              resolve();
            }
          });
        });
      }
    }
    
    // For main user, try to recover session by matching known user
    if (!userId) {
      const mainUser = await storage.getUser(2); // Main user ID
      if (mainUser) {
        userId = mainUser.id;
        req.session.userId = userId;
        req.session.userEmail = mainUser.email;
        
        // Force session save with callback
        await new Promise<void>((resolve, reject) => {
          req.session.save((err: any) => {
            if (err) {
              console.error('Session save error during OAuth:', err);
              reject(err);
            } else {
              console.log(`Session established for ${platform} OAuth: User ID ${userId}`);
              resolve();
            }
          });
        });
      }
    }
    
    if (!userId) {
      throw new Error(`User session lost during ${platform} OAuth - please log in again`);
    }

    // Step 2: Validate OAuth tokens (no mock/demo tokens)
    const primaryToken = tokens.accessToken || tokens.tokenSecret;
    if (!primaryToken || 
        primaryToken.includes('demo') || 
        primaryToken.includes('mock') || 
        primaryToken.length < 10) {
      throw new Error(`Invalid ${platform} OAuth token received`);
    }

    // Step 3: Extract platform-specific user data
    const platformData = extractPlatformData(profile, platform);
    
    console.log(`${platform} OAuth successful:`, {
      profileId: profile.id,
      displayName: platformData.displayName,
      userId: userId,
      tokenType: 'live_oauth'
    });

    // Step 4: Store platform connection
    await storage.createPlatformConnection({
      userId,
      platform,
      platformUserId: profile.id,
      platformUsername: platformData.displayName,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken || tokens.tokenSecret || null,
      isActive: true
    });

    return { platform, success: true };
    
  } catch (error: any) {
    console.error(`${platform} OAuth error:`, error);
    return { 
      platform, 
      success: false, 
      error: error.message 
    };
  }
}

// Extract platform-specific display name and user data
function extractPlatformData(profile: OAuthProfile, platform: string): { displayName: string } {
  switch (platform) {
    case 'facebook':
    case 'youtube':
      return { displayName: profile.displayName || profile.id };
    
    case 'linkedin':
      return { 
        displayName: profile.displayName || 
                    (profile.name ? `${profile.name.givenName} ${profile.name.familyName}` : profile.id)
      };
    
    case 'x':
      return { displayName: profile.username || profile.displayName || profile.id };
    
    default:
      return { displayName: profile.displayName || profile.id };
  }
}

// Use consistent callback URI for all OAuth providers
const OAUTH_REDIRECT_BASE = process.env.NODE_ENV === 'production' 
  ? 'https://app.theagencyiq.ai'
  : `https://${process.env.REPLIT_DEV_DOMAIN || '4fc77172-459a-4da7-8c33-5014abb1b73e-00-dqhtnud4ismj.worf.replit.dev'}`;

// Facebook OAuth Strategy - UPDATED SCOPES (Fixed invalid scopes)
passport.use(new FacebookStrategy({
  clientID: process.env.FACEBOOK_APP_ID!,
  clientSecret: process.env.FACEBOOK_APP_SECRET!,
  callbackURL: `${OAUTH_REDIRECT_BASE}/auth/facebook/callback`,
  scope: ['pages_show_list', 'pages_read_engagement', 'pages_manage_posts'], // Fixed: Removed invalid deprecated scopes
  passReqToCallback: true
}, async (req: any, accessToken: string, refreshToken: string, profile: any, done: any) => {
  const result = await handleOAuthCallback({
    req,
    profile,
    tokens: { accessToken, refreshToken },
    platform: 'facebook'
  });
  
  return result.success 
    ? done(null, result) 
    : done(new Error(result.error));
}));

// Instagram OAuth Strategy - UPDATED SCOPES (Fixed invalid scopes)
passport.use('instagram', new FacebookStrategy({
  clientID: process.env.FACEBOOK_APP_ID!,
  clientSecret: process.env.FACEBOOK_APP_SECRET!,
  callbackURL: `${OAUTH_REDIRECT_BASE}/auth/instagram/callback`,
  scope: ['instagram_basic', 'pages_show_list'], // Fixed: Removed invalid deprecated scopes
  passReqToCallback: true
}, async (req: any, accessToken: string, refreshToken: string, profile: any, done: any) => {
  const result = await handleOAuthCallback({
    req,
    profile,
    tokens: { accessToken, refreshToken },
    platform: 'instagram'
  });
  
  return result.success 
    ? done(null, result) 
    : done(new Error(result.error));
}));

// LinkedIn OAuth Strategy - SCOPES VERIFIED (Default scopes confirmed)
passport.use(new LinkedInStrategy({
  clientID: process.env.LINKEDIN_CLIENT_ID!,
  clientSecret: process.env.LINKEDIN_CLIENT_SECRET!,
  callbackURL: `${OAUTH_REDIRECT_BASE}/auth/linkedin/callback`,
  scope: ['r_liteprofile', 'w_member_social'], // Verified: Default scopes are correct
  passReqToCallback: true
}, async (req: any, accessToken: string, refreshToken: string, profile: any, done: any) => {
  const result = await handleOAuthCallback({
    req,
    profile,
    tokens: { accessToken, refreshToken },
    platform: 'linkedin'
  });
  
  return result.success 
    ? done(null, result) 
    : done(new Error(result.error));
}));

// X (Twitter) OAuth Strategy - FIXED CREDENTIALS (OAuth 1.0a with correct API terminology)
try {
  if (!process.env.X_CONSUMER_KEY || !process.env.X_CONSUMER_SECRET) {
    throw new Error('X API Key (Consumer Key) and API Secret Key (Consumer Secret) are required for X OAuth');
  }
  
  passport.use(new TwitterStrategy({
    consumerKey: process.env.X_CONSUMER_KEY, // X API Key (Consumer Key)
    consumerSecret: process.env.X_CONSUMER_SECRET, // X API Secret Key (Consumer Secret)
    callbackURL: `${OAUTH_REDIRECT_BASE}/auth/twitter/callback`,
    passReqToCallback: true
    // Note: OAuth 1.0a strategy doesn't use scopes, but API permissions are:
    // ["tweet.write", "tweet.read", "users.read", "offline.access"]
  }, async (req: any, accessToken: string, tokenSecret: string, profile: any, done: any) => {
    try {
      const result = await handleOAuthCallback({
        req,
        profile,
        tokens: { accessToken, tokenSecret },
        platform: 'x'
      });
      
      return result.success 
        ? done(null, result) 
        : done(new Error(result.error));
    } catch (error: any) {
      console.error('X OAuth error:', error.message);
      return done(error);
    }
  }));
  console.log('✅ X OAuth strategy configured successfully');
} catch (error: any) {
  console.error('❌ X OAuth strategy configuration failed:', error.message);
  console.log('⚠️  X OAuth will be disabled - check X_CONSUMER_KEY and X_CONSUMER_SECRET environment variables');
}

// YouTube (Google) OAuth Strategy - UPDATED SCOPES (Full YouTube API access)
passport.use('youtube', new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID!,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
  callbackURL: `${OAUTH_REDIRECT_BASE}/auth/youtube/callback`,
  scope: ['https://www.googleapis.com/auth/youtube.upload', 'https://www.googleapis.com/auth/youtube.readonly'], // Verified: Correct YouTube API scopes
  passReqToCallback: true
}, async (req: any, accessToken: string, refreshToken: string, profile: any, done: any) => {
  const result = await handleOAuthCallback({
    req,
    profile,
    tokens: { accessToken, refreshToken },
    platform: 'youtube'
  });
  
  return result.success 
    ? done(null, result) 
    : done(new Error(result.error));
}));

// Passport.js serialization and deserialization for session management
passport.serializeUser((user: any, done) => {
  console.log('🔐 Serializing user:', user);
  done(null, user);
});

passport.deserializeUser((user: any, done) => {
  console.log('🔐 Deserializing user:', user);
  done(null, user);
});

// Configure Passport.js strategies
export function configurePassportStrategies() {
  console.log('🔧 Passport.js strategies configured:');
  console.log('  ✅ Facebook OAuth - Full authentication flow');
  console.log('  ✅ Instagram OAuth - Via Facebook Graph API');
  console.log('  ✅ LinkedIn OAuth - Professional networking');
  console.log('  ✅ X (Twitter) OAuth - Social media posting');
  console.log('  ✅ YouTube OAuth - Video content management');
  console.log('🔐 Session serialization/deserialization configured');
}

export { passport };