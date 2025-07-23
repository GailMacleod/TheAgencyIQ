import passport from 'passport';
import { Strategy as FacebookStrategy } from 'passport-facebook';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as LinkedInStrategy } from 'passport-linkedin-oauth2';
import { db } from '../db';
import { users, platformConnections } from '../../shared/schema';
import { eq, and } from 'drizzle-orm';
import crypto from 'crypto';
import { sendOAuthConfirmationEmail } from './SendGridService';

export class PassportService {
  static initialize() {
    // Passport session serialization
    passport.serializeUser((user: any, done) => {
      done(null, user.id);
    });

    passport.deserializeUser(async (id: string, done) => {
      try {
        const [user] = await db.select().from(users).where(eq(users.id, id));
        done(null, user);
      } catch (error) {
        done(error, null);
      }
    });

    // Configure strategies
    this.setupGoogleStrategy();
    this.setupFacebookStrategy();
    this.setupLinkedInStrategy();
    
    console.log('✅ Passport.js OAuth strategies initialized');
    return passport;
  }

  private static setupGoogleStrategy() {
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      console.log('⚠️ Google OAuth credentials not configured');
      return;
    }

    passport.use(new GoogleStrategy({
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: '/auth/google/callback',
      scope: ['profile', 'email', 'https://www.googleapis.com/auth/youtube.upload']
    }, async (accessToken, refreshToken, profile, done) => {
      try {
        // Store tokens in database
        await this.storeOAuthToken({
          userId: profile.id,
          platform: 'google',
          accessToken,
          refreshToken,
          scope: 'profile email youtube.upload',
          profile
        });

        // Send confirmation email
        if (profile.emails?.[0]?.value) {
          await sendOAuthConfirmationEmail(
            profile.emails[0].value,
            profile.displayName || 'User',
            'Google',
            'YouTube video upload access'
          );
        }

        return done(null, profile);
      } catch (error) {
        console.error('Google OAuth error:', error);
        return done(error, null);
      }
    }));
  }

  private static setupFacebookStrategy() {
    if (!process.env.FACEBOOK_CLIENT_ID || !process.env.FACEBOOK_CLIENT_SECRET) {
      console.log('⚠️ Facebook OAuth credentials not configured');
      return;
    }

    passport.use(new FacebookStrategy({
      clientID: process.env.FACEBOOK_CLIENT_ID,
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
      callbackURL: '/auth/facebook/callback',
      profileFields: ['id', 'displayName', 'emails'],
      scope: ['pages_manage_posts', 'instagram_content_publish', 'pages_read_engagement']
    }, async (accessToken, refreshToken, profile, done) => {
      try {
        // Store tokens in database
        await this.storeOAuthToken({
          userId: profile.id,
          platform: 'facebook',
          accessToken,
          refreshToken,
          scope: 'pages_manage_posts instagram_content_publish',
          profile
        });

        // Send confirmation email
        if (profile.emails?.[0]?.value) {
          await sendOAuthConfirmationEmail(
            profile.emails[0].value,
            profile.displayName || 'User',
            'Facebook',
            'Facebook and Instagram posting access'
          );
        }

        return done(null, profile);
      } catch (error) {
        console.error('Facebook OAuth error:', error);
        return done(error, null);
      }
    }));
  }

  private static setupLinkedInStrategy() {
    if (!process.env.LINKEDIN_CLIENT_ID || !process.env.LINKEDIN_CLIENT_SECRET) {
      console.log('⚠️ LinkedIn OAuth credentials not configured');
      return;
    }

    passport.use(new LinkedInStrategy({
      clientID: process.env.LINKEDIN_CLIENT_ID,
      clientSecret: process.env.LINKEDIN_CLIENT_SECRET,
      callbackURL: '/auth/linkedin/callback',
      scope: ['r_liteprofile', 'r_emailaddress', 'w_member_social']
    }, async (accessToken, refreshToken, profile, done) => {
      try {
        // Store tokens in database
        await this.storeOAuthToken({
          userId: profile.id,
          platform: 'linkedin',
          accessToken,
          refreshToken,
          scope: 'r_liteprofile r_emailaddress w_member_social',
          profile
        });

        // Send confirmation email
        if (profile.emails?.[0]?.value) {
          await sendOAuthConfirmationEmail(
            profile.emails[0].value,
            profile.displayName || 'User',
            'LinkedIn',
            'LinkedIn professional posting access'
          );
        }

        return done(null, profile);
      } catch (error) {
        console.error('LinkedIn OAuth error:', error);
        return done(error, null);
      }
    }));
  }

  private static async storeOAuthToken(tokenData: {
    userId: string;
    platform: string;
    accessToken: string;
    refreshToken?: string;
    scope: string;
    profile: any;
  }): Promise<void> {
    try {
      // Calculate token expiry (typically 1 hour for most platforms)
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

      // Upsert user record
      await db.insert(users).values({
        id: tokenData.userId,
        email: tokenData.profile.emails?.[0]?.value || null,
        firstName: tokenData.profile.name?.givenName || tokenData.profile.displayName?.split(' ')[0] || null,
        lastName: tokenData.profile.name?.familyName || tokenData.profile.displayName?.split(' ')[1] || null,
        profileImageUrl: tokenData.profile.photos?.[0]?.value || null,
        subscriptionPlan: 'starter',
        subscriptionActive: true,
        onboardingCompleted: true,
        onboardingStep: 'oauth_complete'
      }).onConflictDoUpdate({
        target: users.id,
        set: {
          email: tokenData.profile.emails?.[0]?.value || null,
          updatedAt: new Date()
        }
      });

      // Store platform connection
      await db.insert(platformConnections).values({
        userId: tokenData.userId,
        platform: tokenData.platform,
        accessToken: tokenData.accessToken,
        refreshToken: tokenData.refreshToken || null,
        expiresAt,
        scope: tokenData.scope,
        isActive: true
      }).onConflictDoUpdate({
        target: [platformConnections.userId, platformConnections.platform],
        set: {
          accessToken: tokenData.accessToken,
          refreshToken: tokenData.refreshToken || null,
          expiresAt,
          scope: tokenData.scope,
          isActive: true,
          updatedAt: new Date()
        }
      });

      console.log(`✅ OAuth token stored for ${tokenData.platform}: ${tokenData.userId}`);
    } catch (error) {
      console.error('Token storage error:', error);
      throw error;
    }
  }

  static async refreshToken(userId: string, platform: string): Promise<string | null> {
    try {
      const [connection] = await db.select()
        .from(platformConnections)
        .where(and(
          eq(platformConnections.userId, userId),
          eq(platformConnections.platform, platform)
        ));

      if (!connection?.refreshToken) {
        throw new Error('No refresh token available');
      }

      let newAccessToken: string | null = null;

      switch (platform) {
        case 'google':
          newAccessToken = await this.refreshGoogleToken(connection.refreshToken);
          break;
        case 'facebook':
          newAccessToken = await this.refreshFacebookToken(connection.refreshToken);
          break;
        case 'linkedin':
          newAccessToken = await this.refreshLinkedInToken(connection.refreshToken);
          break;
        default:
          throw new Error(`Unsupported platform: ${platform}`);
      }

      if (newAccessToken) {
        // Update token in database
        await db.update(platformConnections)
          .set({
            accessToken: newAccessToken,
            expiresAt: new Date(Date.now() + 60 * 60 * 1000),
            updatedAt: new Date()
          })
          .where(and(
            eq(platformConnections.userId, userId),
            eq(platformConnections.platform, platform)
          ));

        console.log(`✅ Token refreshed for ${platform}: ${userId}`);
        return newAccessToken;
      }

      return null;
    } catch (error) {
      console.error(`Token refresh error for ${platform}:`, error);
      throw error;
    }
  }

  private static async refreshGoogleToken(refreshToken: string): Promise<string | null> {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        refresh_token: refreshToken,
        grant_type: 'refresh_token'
      })
    });

    const data = await response.json();
    return data.access_token || null;
  }

  private static async refreshFacebookToken(refreshToken: string): Promise<string | null> {
    const response = await fetch(`https://graph.facebook.com/v18.0/oauth/access_token?` +
      `client_id=${process.env.FACEBOOK_CLIENT_ID}&` +
      `client_secret=${process.env.FACEBOOK_CLIENT_SECRET}&` +
      `refresh_token=${refreshToken}&` +
      `grant_type=refresh_token`);

    const data = await response.json();
    return data.access_token || null;
  }

  private static async refreshLinkedInToken(refreshToken: string): Promise<string | null> {
    const response = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.LINKEDIN_CLIENT_ID!,
        client_secret: process.env.LINKEDIN_CLIENT_SECRET!,
        refresh_token: refreshToken,
        grant_type: 'refresh_token'
      })
    });

    const data = await response.json();
    return data.access_token || null;
  }
}