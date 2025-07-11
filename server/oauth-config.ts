import passport from 'passport';
// import { Strategy as FacebookStrategy } from 'passport-facebook'; // DISABLED - using custom implementation
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
    // Step 1: Validate user session
    let userId = req.session?.userId;
    
    // LinkedIn session recovery - handle lost sessions during OAuth flow
    if (!userId && platform === 'linkedin' && profile.emails?.[0]) {
      const user = await storage.getUserByEmail(profile.emails[0].value);
      if (user) {
        userId = user.id;
        req.session.userId = userId;
        req.session.save();
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

const OAUTH_REDIRECT_BASE = process.env.REPLIT_DOMAINS 
  ? `https://${process.env.REPLIT_DOMAINS.split(',')[0]}` 
  : 'https://4fc77172-459a-4da7-8c33-5014abb1b73e-00-dqhtnud4ismj.worf.replit.dev';

// Facebook OAuth Strategy - DUMMY STRATEGY to catch remaining calls
import { Strategy as BaseStrategy } from 'passport-strategy';

class FacebookDummyStrategy extends BaseStrategy {
  name: string;
  
  constructor() {
    super();
    this.name = 'facebook';
  }
  
  authenticate(req: any) {
    console.log('🔧 DUMMY Facebook strategy called from:', req.url);
    console.log('🔧 Stack trace:', new Error().stack);
    return this.redirect('/login?error=facebook_disabled&message=Facebook+OAuth+disabled+using+custom+implementation');
  }
}

passport.use(new FacebookDummyStrategy());
console.log('Facebook OAuth: Dummy strategy registered to catch remaining calls');

// Instagram - Direct connection method (OAuth disabled due to app configuration issues)
// Instagram connections are now handled via direct API endpoints in routes.ts

// LinkedIn OAuth Strategy with unified callback handling
passport.use(new LinkedInStrategy({
  clientID: process.env.LINKEDIN_CLIENT_ID!,
  clientSecret: process.env.LINKEDIN_CLIENT_SECRET!,
  callbackURL: `${OAUTH_REDIRECT_BASE}/auth/linkedin/callback`,
  scope: ['r_liteprofile', 'w_member_social'],
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

// X (Twitter) OAuth Strategy - DISABLED - using direct connection (400 errors from api.twitter.com)
passport.use(new TwitterStrategy({
  consumerKey: 'dummy_x_consumer_key',
  consumerSecret: 'dummy_x_consumer_secret',
  callbackURL: `${OAUTH_REDIRECT_BASE}/auth/twitter/callback`,
  userProfileURL: "https://api.twitter.com/1.1/account/verify_credentials.json?include_email=true",
  passReqToCallback: true
}, async (req: any, token: string, tokenSecret: string, profile: any, done: any) => {
  console.log('X OAuth strategy called - should not happen');
  return done(new Error('X OAuth disabled - using direct connection (400 errors)'));
}));

// YouTube (Google) OAuth Strategy with unified callback handling
passport.use('youtube', new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID!,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
  callbackURL: `${OAUTH_REDIRECT_BASE}/auth/youtube/callback`,
  scope: ['https://www.googleapis.com/auth/youtube.upload', 'https://www.googleapis.com/auth/youtube.readonly'],
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

export { passport };