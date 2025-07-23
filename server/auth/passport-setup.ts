import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as FacebookStrategy } from 'passport-facebook';
import { Strategy as LinkedInStrategy } from 'passport-linkedin-oauth2';
import { db } from '../db';
import { users, oauthTokens } from '@shared/schema';
import { eq } from 'drizzle-orm';
import sgMail from '@sendgrid/mail';

// Initialize SendGrid if configured
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

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
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      console.log('🔗 Google OAuth callback received');
      
      // Find or create user
      const email = profile.emails?.[0]?.value;
      if (!email) {
        return done(new Error('No email provided by Google'), null);
      }
      
      let [user] = await db.select().from(users).where(eq(users.email, email));
      
      if (!user) {
        // Create new user
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

      // Store/update OAuth tokens in database
      await db.insert(oauthTokens).values({
        userId: user.id,
        provider: 'google',
        platform: 'youtube',
        accessToken,
        refreshToken,
        expiresAt: new Date(Date.now() + 3600 * 1000), // 1 hour
        scope: ['profile', 'email', 'youtube.upload'],
        profileId: profile.id,
        isValid: true
      }).onConflictDoUpdate({
        target: [oauthTokens.userId, oauthTokens.platform],
        set: {
          accessToken,
          refreshToken,
          expiresAt: new Date(Date.now() + 3600 * 1000),
          isValid: true,
          updatedAt: new Date()
        }
      });

      // Send OAuth confirmation email
      if (user.email) {
        await sendOAuthConfirmationEmail(user.email, 'Google/YouTube', user.firstName || undefined);
      }

      console.log(`✅ Google OAuth completed for user: ${user.email}`);
      return done(null, user);

    } catch (error) {
      console.error('❌ Google OAuth error:', error);
      return done(error, null);
    }
  }));
}

// Facebook OAuth Strategy
if (process.env.FACEBOOK_CLIENT_ID && process.env.FACEBOOK_CLIENT_SECRET) {
  passport.use(new FacebookStrategy({
    clientID: process.env.FACEBOOK_CLIENT_ID,
    clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
    callbackURL: "/auth/facebook/callback",
    profileFields: ['id', 'emails', 'name', 'photos'],
    scope: ['email', 'pages_manage_posts', 'instagram_content_publish']
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      console.log('🔗 Facebook OAuth callback received');
      
      // Find or create user
      const email = profile.emails?.[0]?.value;
      if (!email) {
        return done(new Error('No email provided by Facebook'), null);
      }
      
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

      // Store Facebook tokens for both Facebook and Instagram
      const platforms = ['facebook', 'instagram'];
      for (const platform of platforms) {
        await db.insert(oauthTokens).values({
          userId: user.id,
          provider: 'facebook',
          platform,
          accessToken,
          refreshToken,
          expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days
          scope: ['email', 'pages_manage_posts', 'instagram_content_publish'],
          profileId: profile.id,
          isValid: true
        }).onConflictDoUpdate({
          target: [oauthTokens.userId, oauthTokens.platform],
          set: {
            accessToken,
            refreshToken,
            expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
            isValid: true,
            updatedAt: new Date()
          }
        });
      }

      if (user.email) {
        await sendOAuthConfirmationEmail(user.email, 'Facebook/Instagram', user.firstName || undefined);
      }

      console.log(`✅ Facebook OAuth completed for user: ${user.email}`);
      return done(null, user);

    } catch (error) {
      console.error('❌ Facebook OAuth error:', error);
      return done(error, null);
    }
  }));
}

// LinkedIn OAuth Strategy
if (process.env.LINKEDIN_CLIENT_ID && process.env.LINKEDIN_CLIENT_SECRET) {
  passport.use(new LinkedInStrategy({
    clientID: process.env.LINKEDIN_CLIENT_ID,
    clientSecret: process.env.LINKEDIN_CLIENT_SECRET,
    callbackURL: "/auth/linkedin/callback",
    scope: ['r_emailaddress', 'r_liteprofile', 'w_member_social']
  },
  async (accessToken: string, refreshToken: string, profile: any, done: any) => {
    try {
      console.log('🔗 LinkedIn OAuth callback received');
      
      // Find or create user
      const email = profile.emails?.[0]?.value;
      if (!email) {
        return done(new Error('No email provided by LinkedIn'), null);
      }
      
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
      await db.insert(oauthTokens).values({
        userId: user.id,
        provider: 'linkedin',
        platform: 'linkedin',
        accessToken,
        refreshToken,
        expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days
        scope: ['r_emailaddress', 'r_liteprofile', 'w_member_social'],
        profileId: profile.id,
        isValid: true
      }).onConflictDoUpdate({
        target: [oauthTokens.userId, oauthTokens.platform],
        set: {
          accessToken,
          refreshToken,
          expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
          isValid: true,
          updatedAt: new Date()
        }
      });

      if (user.email) {
        await sendOAuthConfirmationEmail(user.email, 'LinkedIn', user.firstName || undefined);
      }

      console.log(`✅ LinkedIn OAuth completed for user: ${user.email}`);
      return done(null, user);

    } catch (error) {
      console.error('❌ LinkedIn OAuth error:', error);
      return done(error, null);
    }
  }));
}

// Send OAuth confirmation email using SendGrid
async function sendOAuthConfirmationEmail(email: string, platform: string, firstName?: string): Promise<void> {
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

export default passport;