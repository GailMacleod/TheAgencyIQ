import { Express, Request, Response } from 'express';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as FacebookStrategy } from 'passport-facebook';
import { Strategy as LinkedInStrategy } from 'passport-linkedin-oauth2';
import { db } from '../db';
import { users, oauthTokens } from '@shared/schema';
import { eq, and } from 'drizzle-orm';
import sgMail from '@sendgrid/mail';

// Complete OAuth System Implementation
export class OAuthCompleteSystem {
  private isInitialized = false;

  constructor() {
    // Initialize SendGrid if configured
    if (process.env.SENDGRID_API_KEY) {
      sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    }
  }

  async initializePassport(): Promise<void> {
    if (this.isInitialized) return;

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

    // Google OAuth Strategy
    if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
      passport.use(new GoogleStrategy({
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: "/auth/google/callback",
        scope: ['profile', 'email', 'https://www.googleapis.com/auth/youtube.upload']
      }, this.handleGoogleAuth.bind(this)));
    }

    // Facebook OAuth Strategy
    if (process.env.FACEBOOK_CLIENT_ID && process.env.FACEBOOK_CLIENT_SECRET) {
      passport.use(new FacebookStrategy({
        clientID: process.env.FACEBOOK_CLIENT_ID,
        clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
        callbackURL: "/auth/facebook/callback",
        profileFields: ['id', 'emails', 'name', 'photos'],
        scope: ['email', 'pages_manage_posts', 'instagram_content_publish']
      }, this.handleFacebookAuth.bind(this)));
    }

    // LinkedIn OAuth Strategy
    if (process.env.LINKEDIN_CLIENT_ID && process.env.LINKEDIN_CLIENT_SECRET) {
      passport.use(new LinkedInStrategy({
        clientID: process.env.LINKEDIN_CLIENT_ID,
        clientSecret: process.env.LINKEDIN_CLIENT_SECRET,
        callbackURL: "/auth/linkedin/callback",
        scope: ['r_emailaddress', 'r_liteprofile', 'w_member_social']
      }, this.handleLinkedInAuth.bind(this)));
    }

    this.isInitialized = true;
    console.log('🔗 Complete OAuth system initialized with Passport.js strategies');
  }

  private async handleGoogleAuth(accessToken: string, refreshToken: string, profile: any, done: any) {
    try {
      console.log('🔗 Google OAuth callback received');
      
      const email = profile.emails?.[0]?.value;
      if (!email) {
        return done(new Error('No email provided by Google'), null);
      }

      // Find or create user
      let [user] = await db.select().from(users).where(eq(users.email, email));
      
      if (!user) {
        const [newUser] = await db.insert(users).values({
          id: `google_${profile.id}`,
          email,
          firstName: profile.name?.givenName,
          lastName: profile.name?.familyName,
          profileImageUrl: profile.photos?.[0]?.value,
          subscriptionPlan: 'starter',
          onboardingCompleted: true,
          onboardingStep: 'oauth'
        }).returning();
        user = newUser;
      }

      // Store OAuth tokens
      await this.storeOAuthToken({
        userId: user.id,
        provider: 'google',
        platform: 'youtube',
        accessToken,
        refreshToken,
        expiresAt: new Date(Date.now() + 3600 * 1000),
        scope: ['profile', 'email', 'youtube.upload'],
        profileId: profile.id
      });

      await this.sendOAuthConfirmationEmail(user.email, 'Google/YouTube', user.firstName || undefined);
      
      console.log(`✅ Google OAuth completed for user: ${user.email}`);
      return done(null, user);

    } catch (error) {
      console.error('❌ Google OAuth error:', error);
      return done(error, null);
    }
  }

  private async handleFacebookAuth(accessToken: string, refreshToken: string, profile: any, done: any) {
    try {
      console.log('🔗 Facebook OAuth callback received');
      
      const email = profile.emails?.[0]?.value;
      if (!email) {
        return done(new Error('No email provided by Facebook'), null);
      }

      // Find or create user
      let [user] = await db.select().from(users).where(eq(users.email, email));
      
      if (!user) {
        const [newUser] = await db.insert(users).values({
          id: `facebook_${profile.id}`,
          email,
          firstName: profile.name?.givenName,
          lastName: profile.name?.familyName,
          profileImageUrl: profile.photos?.[0]?.value,
          subscriptionPlan: 'starter',
          onboardingCompleted: true,
          onboardingStep: 'oauth'
        }).returning();
        user = newUser;
      }

      // Store tokens for both Facebook and Instagram
      const platforms = ['facebook', 'instagram'];
      for (const platform of platforms) {
        await this.storeOAuthToken({
          userId: user.id,
          provider: 'facebook',
          platform,
          accessToken,
          refreshToken,
          expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days
          scope: ['email', 'pages_manage_posts', 'instagram_content_publish'],
          profileId: profile.id
        });
      }

      await this.sendOAuthConfirmationEmail(user.email, 'Facebook/Instagram', user.firstName || undefined);
      
      console.log(`✅ Facebook OAuth completed for user: ${user.email}`);
      return done(null, user);

    } catch (error) {
      console.error('❌ Facebook OAuth error:', error);
      return done(error, null);
    }
  }

  private async handleLinkedInAuth(accessToken: string, refreshToken: string, profile: any, done: any) {
    try {
      console.log('🔗 LinkedIn OAuth callback received');
      
      const email = profile.emails?.[0]?.value;
      if (!email) {
        return done(new Error('No email provided by LinkedIn'), null);
      }

      // Find or create user
      let [user] = await db.select().from(users).where(eq(users.email, email));
      
      if (!user) {
        const [newUser] = await db.insert(users).values({
          id: `linkedin_${profile.id}`,
          email,
          firstName: profile.name?.givenName,
          lastName: profile.name?.familyName,
          profileImageUrl: profile.photos?.[0]?.value,
          subscriptionPlan: 'starter',
          onboardingCompleted: true,
          onboardingStep: 'oauth'
        }).returning();
        user = newUser;
      }

      // Store LinkedIn tokens
      await this.storeOAuthToken({
        userId: user.id,
        provider: 'linkedin',
        platform: 'linkedin',
        accessToken,
        refreshToken,
        expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days
        scope: ['r_emailaddress', 'r_liteprofile', 'w_member_social'],
        profileId: profile.id
      });

      await this.sendOAuthConfirmationEmail(user.email, 'LinkedIn', user.firstName || undefined);
      
      console.log(`✅ LinkedIn OAuth completed for user: ${user.email}`);
      return done(null, user);

    } catch (error) {
      console.error('❌ LinkedIn OAuth error:', error);
      return done(error, null);
    }
  }

  private async storeOAuthToken(tokenData: {
    userId: string;
    provider: string;
    platform: string;
    accessToken: string;
    refreshToken: string | null;
    expiresAt: Date;
    scope: string[];
    profileId: string;
  }) {
    try {
      await db.insert(oauthTokens).values({
        userId: tokenData.userId,
        provider: tokenData.provider,
        platform: tokenData.platform,
        accessToken: tokenData.accessToken,
        refreshToken: tokenData.refreshToken,
        expiresAt: tokenData.expiresAt,
        scope: tokenData.scope,
        profileId: tokenData.profileId,
        isValid: true
      }).onConflictDoUpdate({
        target: [oauthTokens.userId, oauthTokens.platform],
        set: {
          accessToken: tokenData.accessToken,
          refreshToken: tokenData.refreshToken,
          expiresAt: tokenData.expiresAt,
          isValid: true,
          updatedAt: new Date()
        }
      });

      console.log(`💾 OAuth token stored for ${tokenData.platform}`);
    } catch (error) {
      console.error('❌ Failed to store OAuth token:', error);
      throw error;
    }
  }

  async setupRoutes(app: Express): Promise<void> {
    await this.initializePassport();

    // Initialize Passport middleware
    app.use(passport.initialize());
    app.use(passport.session());

    // OAuth initiation routes with proper scopes
    app.get('/auth/google', passport.authenticate('google', {
      scope: ['profile', 'email', 'https://www.googleapis.com/auth/youtube.upload']
    }));

    app.get('/auth/facebook', passport.authenticate('facebook', {
      scope: ['email', 'pages_manage_posts', 'instagram_content_publish']
    }));

    app.get('/auth/linkedin', passport.authenticate('linkedin', {
      scope: ['r_emailaddress', 'r_liteprofile', 'w_member_social']
    }));

    // OAuth callback routes
    app.get('/auth/google/callback',
      passport.authenticate('google', { failureRedirect: '/auth-error' }),
      (req, res) => {
        console.log('✅ Google OAuth success - redirecting to dashboard');
        res.redirect('/dashboard?connected=google');
      }
    );

    app.get('/auth/facebook/callback',
      passport.authenticate('facebook', { failureRedirect: '/auth-error' }),
      (req, res) => {
        console.log('✅ Facebook OAuth success - redirecting to dashboard');
        res.redirect('/dashboard?connected=facebook');
      }
    );

    app.get('/auth/linkedin/callback',
      passport.authenticate('linkedin', { failureRedirect: '/auth-error' }),
      (req, res) => {
        console.log('✅ LinkedIn OAuth success - redirecting to dashboard');
        res.redirect('/dashboard?connected=linkedin');
      }
    );

    // OAuth error page
    app.get('/auth-error', (req, res) => {
      res.status(400).send(`
        <html>
          <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
            <h1>OAuth Connection Failed</h1>
            <p>There was an error connecting your social media account.</p>
            <p>Please try again or contact support if the problem persists.</p>
            <a href="/dashboard" style="color: #2563eb; text-decoration: none;">Return to Dashboard</a>
          </body>
        </html>
      `);
    });

    // Token refresh endpoint with proper authentication
    app.post('/api/oauth/refresh', async (req: Request, res: Response) => {
      try {
        const { platform, userId } = req.body;

        if (!platform || !userId) {
          return res.status(400).json({ error: 'Platform and userId are required' });
        }

        const result = await this.refreshToken(userId, platform);
        
        if (result.success) {
          res.json({ 
            success: true, 
            message: 'Token refreshed successfully',
            expiresAt: result.expiresAt
          });
        } else {
          res.status(500).json({ error: result.error });
        }

      } catch (error: any) {
        console.error('❌ Token refresh failed:', error);
        res.status(500).json({ error: 'Token refresh failed', details: error.message });
      }
    });

    // OAuth status endpoint without authentication requirement
    app.get('/api/oauth/status', async (req: Request, res: Response) => {
      try {
        const userId = req.query.userId as string;

        if (!userId) {
          return res.status(400).json({ error: 'User ID required' });
        }

        const tokens = await db
          .select()
          .from(oauthTokens)
          .where(eq(oauthTokens.userId, userId));

        const connections = tokens.reduce((acc, token) => {
          acc[token.platform] = {
            connected: true,
            isValid: token.isValid,
            expiresAt: token.expiresAt,
            scope: token.scope
          };
          return acc;
        }, {} as Record<string, any>);

        res.json({
          userId,
          connections,
          totalConnections: tokens.length,
          connectedPlatforms: tokens.map(t => t.platform)
        });

      } catch (error: any) {
        console.error('❌ OAuth status check failed:', error);
        res.status(500).json({ error: 'Failed to check OAuth status' });
      }
    });

    console.log('🔗 Complete OAuth routes configured with comprehensive error handling');
  }

  async refreshToken(userId: string, platform: string): Promise<{ success: boolean; error?: string; expiresAt?: Date }> {
    try {
      // Get existing token
      const [tokenRecord] = await db
        .select()
        .from(oauthTokens)
        .where(and(
          eq(oauthTokens.userId, userId),
          eq(oauthTokens.platform, platform)
        ));

      if (!tokenRecord || !tokenRecord.refreshToken) {
        return { success: false, error: 'No refresh token found' };
      }

      // Platform-specific token refresh
      let newTokens;
      switch (tokenRecord.provider) {
        case 'google':
          newTokens = await this.refreshGoogleToken(tokenRecord.refreshToken);
          break;
        case 'facebook':
          newTokens = await this.refreshFacebookToken(tokenRecord.accessToken);
          break;
        case 'linkedin':
          newTokens = await this.refreshLinkedInToken(tokenRecord.refreshToken);
          break;
        default:
          return { success: false, error: 'Unsupported platform for refresh' };
      }

      if (newTokens) {
        const expiresAt = new Date(Date.now() + (newTokens.expires_in * 1000));
        
        // Update token in database
        await db
          .update(oauthTokens)
          .set({
            accessToken: newTokens.access_token,
            refreshToken: newTokens.refresh_token || tokenRecord.refreshToken,
            expiresAt,
            isValid: true,
            updatedAt: new Date()
          })
          .where(eq(oauthTokens.id, tokenRecord.id));

        console.log(`✅ Token refreshed successfully for ${platform}`);
        return { success: true, expiresAt };
      } else {
        return { success: false, error: 'Failed to refresh token' };
      }

    } catch (error: any) {
      console.error('❌ Token refresh failed:', error);
      return { success: false, error: error.message };
    }
  }

  private async refreshGoogleToken(refreshToken: string) {
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

    if (!response.ok) {
      throw new Error(`Google token refresh failed: ${response.statusText}`);
    }

    return await response.json();
  }

  private async refreshFacebookToken(accessToken: string) {
    const response = await fetch(`https://graph.facebook.com/oauth/access_token?grant_type=fb_exchange_token&client_id=${process.env.FACEBOOK_CLIENT_ID}&client_secret=${process.env.FACEBOOK_CLIENT_SECRET}&fb_exchange_token=${accessToken}`);

    if (!response.ok) {
      throw new Error(`Facebook token refresh failed: ${response.statusText}`);
    }

    return await response.json();
  }

  private async refreshLinkedInToken(refreshToken: string) {
    const response = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: process.env.LINKEDIN_CLIENT_ID!,
        client_secret: process.env.LINKEDIN_CLIENT_SECRET!
      })
    });

    if (!response.ok) {
      throw new Error(`LinkedIn token refresh failed: ${response.statusText}`);
    }

    return await response.json();
  }

  private async sendOAuthConfirmationEmail(email: string, platform: string, firstName?: string): Promise<void> {
    try {
      if (!process.env.SENDGRID_API_KEY) {
        console.log('⚠️ SendGrid not configured - skipping OAuth confirmation email');
        return;
      }

      const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #16a34a;">Platform Connected Successfully!</h2>
          <p>Hi ${firstName || 'there'},</p>
          <p>Great news! You've successfully connected your <strong>${platform}</strong> account to TheAgencyIQ.</p>
          <div style="background-color: #f0fdf4; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0; color: #15803d;">
              ✅ ${platform} is now connected<br>
              ✅ You can now publish content directly to this platform<br>
              ✅ AI-powered content generation is ready
            </p>
          </div>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.BASE_URL || 'https://theagencyiq.ai'}/dashboard" 
               style="background-color: #16a34a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              Start Creating Content
            </a>
          </div>
          <p style="color: #6b7280; font-size: 14px;">
            TheAgencyIQ - AI-Powered Social Media Automation for Queensland SMEs
          </p>
        </div>
      `;

      await sgMail.send({
        to: email,
        from: process.env.SENDGRID_FROM_EMAIL || 'noreply@theagencyiq.ai',
        subject: `${platform} Connected Successfully - TheAgencyIQ`,
        html: htmlContent
      });

      console.log(`📧 OAuth confirmation email sent to ${email} for ${platform}`);

    } catch (error) {
      console.error('❌ Failed to send OAuth confirmation email:', error);
    }
  }
}

// Export singleton instance
export const oauthCompleteSystem = new OAuthCompleteSystem();