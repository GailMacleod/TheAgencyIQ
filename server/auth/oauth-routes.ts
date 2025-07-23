import { Express } from 'express';
import passport from './passport-setup';
import { db } from '../db';
import { oauthTokens } from '@shared/schema';
import { eq, and } from 'drizzle-orm';

export function setupOAuthRoutes(app: Express) {
  
  // Initialize Passport middleware
  app.use(passport.initialize());
  app.use(passport.session());

  // OAuth initiation routes
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

  // Token refresh endpoint
  app.post('/api/oauth/refresh', async (req, res) => {
    try {
      const { platform, userId } = req.body;

      if (!platform || !userId) {
        return res.status(400).json({ error: 'Platform and userId are required' });
      }

      // Get existing token
      const [tokenRecord] = await db
        .select()
        .from(oauthTokens)
        .where(and(
          eq(oauthTokens.userId, userId),
          eq(oauthTokens.platform, platform)
        ));

      if (!tokenRecord || !tokenRecord.refreshToken) {
        return res.status(404).json({ error: 'No refresh token found' });
      }

      // Platform-specific token refresh
      let newTokens;
      switch (tokenRecord.provider) {
        case 'google':
          newTokens = await refreshGoogleToken(tokenRecord.refreshToken);
          break;
        case 'facebook':
          newTokens = await refreshFacebookToken(tokenRecord.accessToken);
          break;
        case 'linkedin':
          newTokens = await refreshLinkedInToken(tokenRecord.refreshToken);
          break;
        default:
          return res.status(400).json({ error: 'Unsupported platform for refresh' });
      }

      if (newTokens) {
        // Update token in database
        await db
          .update(oauthTokens)
          .set({
            accessToken: newTokens.access_token,
            refreshToken: newTokens.refresh_token || tokenRecord.refreshToken,
            expiresAt: new Date(Date.now() + (newTokens.expires_in * 1000)),
            isValid: true,
            updatedAt: new Date()
          })
          .where(eq(oauthTokens.id, tokenRecord.id));

        console.log(`✅ Token refreshed successfully for ${platform}`);
        res.json({ 
          success: true, 
          message: 'Token refreshed successfully',
          expiresAt: new Date(Date.now() + (newTokens.expires_in * 1000))
        });
      } else {
        throw new Error('Failed to refresh token');
      }

    } catch (error: any) {
      console.error('❌ Token refresh failed:', error);
      res.status(500).json({ error: 'Token refresh failed', details: error.message });
    }
  });

  // Check OAuth connections status
  app.get('/api/oauth/status', async (req, res) => {
    try {
      const userId = req.session?.userId || req.query.userId;

      if (!userId) {
        return res.status(401).json({ error: 'User ID required' });
      }

      const tokens = await db
        .select()
        .from(oauthTokens)
        .where(eq(oauthTokens.userId, userId as string));

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

  console.log('🔗 OAuth routes configured with Passport.js strategies');
}

// Platform-specific token refresh functions
async function refreshGoogleToken(refreshToken: string) {
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

async function refreshFacebookToken(accessToken: string) {
  const response = await fetch(`https://graph.facebook.com/oauth/access_token?grant_type=fb_exchange_token&client_id=${process.env.FACEBOOK_CLIENT_ID}&client_secret=${process.env.FACEBOOK_CLIENT_SECRET}&fb_exchange_token=${accessToken}`);

  if (!response.ok) {
    throw new Error(`Facebook token refresh failed: ${response.statusText}`);
  }

  return await response.json();
}

async function refreshLinkedInToken(refreshToken: string) {
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