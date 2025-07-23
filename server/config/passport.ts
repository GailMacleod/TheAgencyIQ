/**
 * Passport OAuth Configuration with Database Integration
 * Comprehensive OAuth strategies with Drizzle ORM token persistence
 */

import passport from 'passport';
import { Strategy as FacebookStrategy } from 'passport-facebook';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as LinkedInStrategy } from 'passport-linkedin-oauth2';
import { Strategy as TwitterStrategy } from 'passport-twitter';
import { db } from '../db';
import { users, oauthTokens } from '@shared/schema';
import { eq, and } from 'drizzle-orm';

// OAuth credential validation
const oauthCredentials = {
  facebook: {
    clientID: process.env.FACEBOOK_APP_ID,
    clientSecret: process.env.FACEBOOK_APP_SECRET,
    callbackURL: '/auth/facebook/callback'
  },
  google: {
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: '/auth/google/callback'
  },
  linkedin: {
    clientID: process.env.LINKEDIN_CLIENT_ID,
    clientSecret: process.env.LINKEDIN_CLIENT_SECRET,
    callbackURL: '/auth/linkedin/callback'
  },
  twitter: {
    consumerKey: process.env.TWITTER_CONSUMER_KEY,
    consumerSecret: process.env.TWITTER_CONSUMER_SECRET,
    callbackURL: '/auth/twitter/callback'
  }
};

/**
 * User serialization/deserialization with Drizzle
 */
passport.serializeUser((user: any, done) => {
  console.log(`📝 Serializing user: ${user.id}`);
  done(null, user.id);
});

passport.deserializeUser(async (id: string, done) => {
  try {
    console.log(`🔍 Deserializing user: ${id}`);
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, id));
    
    if (!user) {
      return done(new Error('User not found'), null);
    }
    
    console.log(`✅ User deserialized: ${user.email}`);
    done(null, user);
  } catch (error) {
    console.error('❌ Deserialization error:', error);
    done(error, null);
  }
});

/**
 * OAuth callback handler with database persistence
 */
async function handleOAuthCallback({
  platform,
  platformId,
  username,
  email,
  displayName,
  profileImageUrl,
  accessToken,
  refreshToken,
  scopes
}: {
  platform: string;
  platformId: string;
  username?: string;
  email?: string;
  displayName?: string;
  profileImageUrl?: string;
  accessToken: string;
  refreshToken?: string;
  scopes: string[];
}) {
  console.log(`🔄 Processing OAuth callback for ${platform}: ${email || username}`);

  try {
    // Find or create user with Drizzle
    let [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email || ''));
    
    if (!user && email) {
      console.log(`👤 Creating new user for ${email}`);
      [user] = await db
        .insert(users)
        .values({
          id: `user_${Date.now()}_${Math.random().toString(36).substring(2)}`,
          email,
          firstName: displayName?.split(' ')[0] || username || 'User',
          lastName: displayName?.split(' ').slice(1).join(' ') || '',
          profileImageUrl,
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning();
    }

    if (!user) {
      throw new Error(`Unable to create or find user for ${platform} OAuth`);
    }

    // Store OAuth tokens with Drizzle transaction
    await db.transaction(async (tx) => {
      // Remove existing token for this platform
      await tx
        .delete(oauthTokens)
        .where(and(
          eq(oauthTokens.userId, user.id),
          eq(oauthTokens.platform, platform)
        ));

      // Insert new token
      const tokenExpiry = new Date();
      if (platform === 'facebook' || platform === 'google') {
        tokenExpiry.setHours(tokenExpiry.getHours() + 2); // 2 hours
      } else {
        tokenExpiry.setHours(tokenExpiry.getHours() + 1); // 1 hour default
      }

      await tx
        .insert(oauthTokens)
        .values({
          id: `token_${Date.now()}_${Math.random().toString(36).substring(2)}`,
          userId: user.id,
          platform,
          platformUserId: platformId,
          platformUsername: username || email || 'unknown',
          accessToken,
          refreshToken,
          scopes: scopes.join(','),
          expiresAt: tokenExpiry,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        });
    });

    console.log(`✅ ${platform} OAuth tokens stored for user ${user.id}`);
    return user;

  } catch (error) {
    console.error(`❌ OAuth callback error for ${platform}:`, error);
    throw error;
  }
}

/**
 * Configure OAuth strategies
 */
export function configurePassport(): void {
  console.log('🔐 Configuring Passport OAuth strategies...');

  // Facebook Strategy
  if (oauthCredentials.facebook.clientID && oauthCredentials.facebook.clientSecret) {
    passport.use(new FacebookStrategy({
      ...oauthCredentials.facebook,
      profileFields: ['id', 'emails', 'name', 'picture.type(large)'],
      scope: ['email', 'public_profile', 'pages_manage_posts', 'pages_read_engagement']
    }, async (accessToken, refreshToken, profile, done) => {
      try {
        const user = await handleOAuthCallback({
          platform: 'facebook',
          platformId: profile.id,
          username: profile.username || profile.id,
          email: profile.emails?.[0]?.value,
          displayName: `${profile.name?.givenName} ${profile.name?.familyName}`,
          profileImageUrl: profile.photos?.[0]?.value,
          accessToken,
          refreshToken,
          scopes: ['email', 'public_profile', 'pages_manage_posts', 'pages_read_engagement']
        });
        done(null, user);
      } catch (error) {
        done(error, null);
      }
    }));
    console.log('✅ Facebook OAuth strategy configured');
  }

  // Google Strategy (YouTube)
  if (oauthCredentials.google.clientID && oauthCredentials.google.clientSecret) {
    passport.use(new GoogleStrategy({
      ...oauthCredentials.google,
      scope: ['profile', 'email', 'https://www.googleapis.com/auth/youtube.upload']
    }, async (accessToken, refreshToken, profile, done) => {
      try {
        const user = await handleOAuthCallback({
          platform: 'google',
          platformId: profile.id,
          username: profile.emails?.[0]?.value,
          email: profile.emails?.[0]?.value,
          displayName: profile.displayName,
          profileImageUrl: profile.photos?.[0]?.value,
          accessToken,
          refreshToken,
          scopes: ['profile', 'email', 'https://www.googleapis.com/auth/youtube.upload']
        });
        done(null, user);
      } catch (error) {
        done(error, null);
      }
    }));
    console.log('✅ Google OAuth strategy configured');
  }

  // LinkedIn Strategy
  if (oauthCredentials.linkedin.clientID && oauthCredentials.linkedin.clientSecret) {
    passport.use(new LinkedInStrategy({
      ...oauthCredentials.linkedin,
      scope: ['r_liteprofile', 'r_emailaddress', 'w_member_social']
    }, async (accessToken, refreshToken, profile, done) => {
      try {
        const user = await handleOAuthCallback({
          platform: 'linkedin',
          platformId: profile.id,
          username: profile.emails?.[0]?.value,
          email: profile.emails?.[0]?.value,
          displayName: profile.displayName,
          profileImageUrl: profile.photos?.[0]?.value,
          accessToken,
          refreshToken,
          scopes: ['r_liteprofile', 'r_emailaddress', 'w_member_social']
        });
        done(null, user);
      } catch (error) {
        done(error, null);
      }
    }));
    console.log('✅ LinkedIn OAuth strategy configured');
  }

  // Twitter Strategy
  if (oauthCredentials.twitter.consumerKey && oauthCredentials.twitter.consumerSecret) {
    passport.use(new TwitterStrategy({
      ...oauthCredentials.twitter,
      includeEmail: true
    }, async (token, tokenSecret, profile, done) => {
      try {
        const user = await handleOAuthCallback({
          platform: 'twitter',
          platformId: profile.id,
          username: profile.username,
          email: profile.emails?.[0]?.value,
          displayName: profile.displayName,
          profileImageUrl: profile.photos?.[0]?.value,
          accessToken: token,
          refreshToken: tokenSecret,
          scopes: ['read', 'write']
        });
        done(null, user);
      } catch (error) {
        done(error, null);
      }
    }));
    console.log('✅ Twitter OAuth strategy configured');
  }

  console.log('🎉 Passport OAuth configuration complete');
}

/**
 * Get OAuth tokens for user and platform
 */
export async function getOAuthTokens(userId: string, platform: string) {
  const [tokens] = await db
    .select()
    .from(oauthTokens)
    .where(and(
      eq(oauthTokens.userId, userId),
      eq(oauthTokens.platform, platform),
      eq(oauthTokens.isActive, true)
    ));
  
  return tokens;
}

/**
 * Update OAuth token
 */
export async function updateOAuthToken(
  userId: string, 
  platform: string, 
  newAccessToken: string, 
  newRefreshToken?: string
) {
  await db
    .update(oauthTokens)
    .set({
      accessToken: newAccessToken,
      refreshToken: newRefreshToken || undefined,
      updatedAt: new Date()
    })
    .where(and(
      eq(oauthTokens.userId, userId),
      eq(oauthTokens.platform, platform)
    ));
}

export { oauthCredentials };