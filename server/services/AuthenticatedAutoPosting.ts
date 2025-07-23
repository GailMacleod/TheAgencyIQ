import { db } from '../db';
import { users, quotaUsage, postSchedule, platformConnections } from '@shared/schema';
import { eq, and } from 'drizzle-orm';
import passport from 'passport';
import { Strategy as TwitterStrategy } from 'passport-twitter';
import { Strategy as FacebookStrategy } from 'passport-facebook';
import { Strategy as LinkedInStrategy } from 'passport-linkedin-oauth2';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import sgMail from '@sendgrid/mail';
import twilio from 'twilio';
import { AtomicQuotaManager } from '../middleware/AtomicQuotaManager';

// Initialize Twilio client
let twilioClient: any = null;
if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
  twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
}

// Initialize SendGrid
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

interface PostResult {
  success: boolean;
  platform: string;
  postId?: string;
  error?: string;
  retryAttempt?: number;
}

interface AuthTokens {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
  scope?: string[];
}

export class AuthenticatedAutoPosting {
  
  constructor() {
    this.initializePassportStrategies();
  }

  /**
   * Initialize Passport.js strategies for all platforms
   */
  private initializePassportStrategies() {
    // Twitter Strategy
    if (process.env.TWITTER_CONSUMER_KEY && process.env.TWITTER_CONSUMER_SECRET) {
      passport.use(new TwitterStrategy({
        consumerKey: process.env.TWITTER_CONSUMER_KEY,
        consumerSecret: process.env.TWITTER_CONSUMER_SECRET,
        callbackURL: '/auth/twitter/callback'
      }, async (token, tokenSecret, profile, done) => {
        try {
          await this.storeOAuthTokens(profile.id, 'twitter', {
            accessToken: token,
            refreshToken: tokenSecret,
            scope: ['tweet.write', 'users.read']
          });
          return done(null, profile);
        } catch (error) {
          return done(error);
        }
      }));
    }

    // Facebook Strategy
    if (process.env.FACEBOOK_APP_ID && process.env.FACEBOOK_APP_SECRET) {
      passport.use(new FacebookStrategy({
        clientID: process.env.FACEBOOK_APP_ID,
        clientSecret: process.env.FACEBOOK_APP_SECRET,
        callbackURL: '/auth/facebook/callback'
      }, async (accessToken, refreshToken, profile, done) => {
        try {
          await this.storeOAuthTokens(profile.id, 'facebook', {
            accessToken,
            refreshToken,
            scope: ['pages_manage_posts', 'pages_read_engagement']
          });
          return done(null, profile);
        } catch (error) {
          return done(error);
        }
      }));
    }

    // LinkedIn Strategy
    if (process.env.LINKEDIN_CLIENT_ID && process.env.LINKEDIN_CLIENT_SECRET) {
      passport.use(new LinkedInStrategy({
        clientID: process.env.LINKEDIN_CLIENT_ID,
        clientSecret: process.env.LINKEDIN_CLIENT_SECRET,
        callbackURL: '/auth/linkedin/callback',
        scope: ['w_member_social', 'r_liteprofile']
      }, async (accessToken, refreshToken, profile, done) => {
        try {
          await this.storeOAuthTokens(profile.id, 'linkedin', {
            accessToken,
            refreshToken,
            scope: ['w_member_social']
          });
          return done(null, profile);
        } catch (error) {
          return done(error);
        }
      }));
    }

    // Google Strategy (for YouTube)
    if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
      passport.use(new GoogleStrategy({
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: '/auth/google/callback'
      }, async (accessToken, refreshToken, profile, done) => {
        try {
          await this.storeOAuthTokens(profile.id, 'youtube', {
            accessToken,
            refreshToken,
            scope: ['https://www.googleapis.com/auth/youtube.upload']
          });
          return done(null, profile);
        } catch (error) {
          return done(error);
        }
      }));
    }

    console.log('✅ Passport strategies initialized for authenticated posting');
  }

  /**
   * Store OAuth tokens in database using Drizzle
   */
  private async storeOAuthTokens(userId: string, platform: string, tokens: AuthTokens) {
    try {
      await db.insert(platformConnections).values({
        userId,
        platform,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresAt: tokens.expiresAt,
        scope: tokens.scope?.join(','),
        isActive: true
      }).onConflictDoUpdate({
        target: [platformConnections.userId, platformConnections.platform],
        set: {
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          expiresAt: tokens.expiresAt,
          scope: tokens.scope?.join(','),
          updatedAt: new Date()
        }
      });

      console.log(`✅ OAuth tokens stored for ${platform} - User: ${userId}`);
    } catch (error) {
      console.error(`❌ Failed to store OAuth tokens for ${platform}:`, error);
      throw error;
    }
  }

  /**
   * Authenticate auto-posting with real OAuth tokens and Drizzle transactions
   */
  async enforceAutoPosting(userId: string, posts: any[]): Promise<PostResult[]> {
    console.log(`🚀 Starting authenticated auto-posting for user ${userId} with ${posts.length} posts`);
    
    const results: PostResult[] = [];

    for (const post of posts) {
      try {
        // Check quota using atomic manager before posting
        const quotaResult = await AtomicQuotaManager.enforceQuota(
          userId,
          post.platform,
          'post',
          'professional'
        );

        if (!quotaResult.allowed) {
          results.push({
            success: false,
            platform: post.platform,
            error: quotaResult.message
          });
          continue;
        }

        // Perform authenticated posting with Drizzle transaction
        const postResult = await db.transaction(async (tx) => {
          // Get OAuth tokens from database
          const connection = await tx
            .select()
            .from(platformConnections)
            .where(
              and(
                eq(platformConnections.userId, userId),
                eq(platformConnections.platform, post.platform),
                eq(platformConnections.isActive, true)
              )
            );

          if (!connection.length) {
            throw new Error(`No OAuth connection found for ${post.platform}`);
          }

          const tokens = connection[0];

          // Refresh token if expired
          if (tokens.expiresAt && new Date() > tokens.expiresAt) {
            await this.refreshTokenIfNeeded(userId, post.platform, tokens);
          }

          // Post to platform with exponential backoff retry
          const platformResult = await this.postToPlatformWithRetry(
            post.platform,
            post.content,
            tokens.accessToken,
            3 // max retries
          );

          // Update post status in database
          await tx
            .update(postSchedule)
            .set({
              status: platformResult.success ? 'posted' : 'failed',
              isCounted: platformResult.success,
              publishedAt: platformResult.success ? new Date() : undefined
            })
            .where(eq(postSchedule.postId, post.postId));

          return platformResult;
        });

        results.push(postResult);

        // Send notifications
        await this.sendPostNotifications(userId, postResult);

      } catch (error) {
        console.error(`❌ Auto-posting failed for ${post.platform}:`, error);
        results.push({
          success: false,
          platform: post.platform,
          error: error.message
        });

        // Send failure notification
        await this.sendFailureNotification(userId, post.platform, error.message);
      }
    }

    console.log(`✅ Auto-posting completed: ${results.filter(r => r.success).length}/${results.length} successful`);
    return results;
  }

  /**
   * Post to platform with exponential backoff retry
   */
  private async postToPlatformWithRetry(
    platform: string,
    content: string,
    accessToken: string,
    maxRetries: number
  ): Promise<PostResult> {
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const result = await this.postToPlatform(platform, content, accessToken);
        
        if (result.success) {
          return { ...result, retryAttempt: attempt };
        }

        // If not successful and not last attempt, wait before retry
        if (attempt < maxRetries) {
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 30000); // Exponential backoff max 30s
          await new Promise(resolve => setTimeout(resolve, delay));
        }

      } catch (error) {
        console.error(`❌ Attempt ${attempt} failed for ${platform}:`, error);
        
        if (attempt === maxRetries) {
          return {
            success: false,
            platform,
            error: error.message,
            retryAttempt: attempt
          };
        }

        // Wait before retry
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 30000);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    return {
      success: false,
      platform,
      error: 'Max retry attempts exceeded',
      retryAttempt: maxRetries
    };
  }

  /**
   * Real platform API calls (no mock random success)
   */
  private async postToPlatform(platform: string, content: string, accessToken: string): Promise<PostResult> {
    switch (platform) {
      case 'twitter':
        return await this.postToTwitter(content, accessToken);
      case 'facebook':
        return await this.postToFacebook(content, accessToken);
      case 'linkedin':
        return await this.postToLinkedIn(content, accessToken);
      case 'instagram':
        return await this.postToInstagram(content, accessToken);
      case 'youtube':
        return await this.postToYouTube(content, accessToken);
      default:
        throw new Error(`Unsupported platform: ${platform}`);
    }
  }

  private async postToTwitter(content: string, accessToken: string): Promise<PostResult> {
    const response = await fetch('https://api.twitter.com/2/tweets', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ text: content })
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(`Twitter API error: ${data.title || 'Unknown error'}`);
    }

    return {
      success: true,
      platform: 'twitter',
      postId: data.data?.id
    };
  }

  private async postToFacebook(content: string, accessToken: string): Promise<PostResult> {
    const response = await fetch('https://graph.facebook.com/v18.0/me/feed', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ message: content })
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(`Facebook API error: ${data.error?.message || 'Unknown error'}`);
    }

    return {
      success: true,
      platform: 'facebook',
      postId: data.id
    };
  }

  private async postToLinkedIn(content: string, accessToken: string): Promise<PostResult> {
    const response = await fetch('https://api.linkedin.com/v2/ugcPosts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        author: 'urn:li:person:PLACEHOLDER',
        lifecycleState: 'PUBLISHED',
        specificContent: {
          'com.linkedin.ugc.ShareContent': {
            shareCommentary: {
              text: content
            },
            shareMediaCategory: 'NONE'
          }
        },
        visibility: {
          'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC'
        }
      })
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(`LinkedIn API error: ${data.message || 'Unknown error'}`);
    }

    return {
      success: true,
      platform: 'linkedin',
      postId: data.id
    };
  }

  private async postToInstagram(content: string, accessToken: string): Promise<PostResult> {
    // Instagram posting requires Facebook Graph API
    const response = await fetch('https://graph.facebook.com/v18.0/me/media', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        caption: content,
        media_type: 'TEXT'
      })
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(`Instagram API error: ${data.error?.message || 'Unknown error'}`);
    }

    return {
      success: true,
      platform: 'instagram',
      postId: data.id
    };
  }

  private async postToYouTube(content: string, accessToken: string): Promise<PostResult> {
    // YouTube Community Posts API
    const response = await fetch('https://www.googleapis.com/youtube/v3/communityPosts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        snippet: {
          textMessageDetails: {
            messageText: content
          }
        }
      })
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(`YouTube API error: ${data.error?.message || 'Unknown error'}`);
    }

    return {
      success: true,
      platform: 'youtube',
      postId: data.id
    };
  }

  /**
   * Refresh OAuth token if needed
   */
  private async refreshTokenIfNeeded(userId: string, platform: string, tokens: any) {
    try {
      console.log(`🔄 Refreshing ${platform} token for user ${userId}`);
      
      let refreshUrl = '';
      let refreshPayload: any = {};

      switch (platform) {
        case 'google':
        case 'youtube':
          refreshUrl = 'https://oauth2.googleapis.com/token';
          refreshPayload = {
            client_id: process.env.GOOGLE_CLIENT_ID,
            client_secret: process.env.GOOGLE_CLIENT_SECRET,
            refresh_token: tokens.refreshToken,
            grant_type: 'refresh_token'
          };
          break;
        case 'facebook':
        case 'instagram':
          refreshUrl = 'https://graph.facebook.com/v18.0/oauth/access_token';
          refreshPayload = {
            client_id: process.env.FACEBOOK_APP_ID,
            client_secret: process.env.FACEBOOK_APP_SECRET,
            grant_type: 'fb_exchange_token',
            fb_exchange_token: tokens.accessToken
          };
          break;
        case 'linkedin':
          refreshUrl = 'https://www.linkedin.com/oauth/v2/accessToken';
          refreshPayload = {
            client_id: process.env.LINKEDIN_CLIENT_ID,
            client_secret: process.env.LINKEDIN_CLIENT_SECRET,
            refresh_token: tokens.refreshToken,
            grant_type: 'refresh_token'
          };
          break;
      }

      const response = await fetch(refreshUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(refreshPayload)
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(`Token refresh failed: ${data.error_description || data.error}`);
      }

      // Update tokens in database
      await db
        .update(platformConnections)
        .set({
          accessToken: data.access_token,
          refreshToken: data.refresh_token || tokens.refreshToken,
          expiresAt: data.expires_in ? new Date(Date.now() + data.expires_in * 1000) : undefined,
          updatedAt: new Date()
        })
        .where(
          and(
            eq(platformConnections.userId, userId),
            eq(platformConnections.platform, platform)
          )
        );

      console.log(`✅ Token refreshed successfully for ${platform}`);

    } catch (error) {
      console.error(`❌ Token refresh failed for ${platform}:`, error);
      throw error;
    }
  }

  /**
   * Send notifications via Twilio SMS and SendGrid email
   */
  private async sendPostNotifications(userId: string, result: PostResult) {
    try {
      // Get user details
      const user = await db
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (!user.length) return;

      const userInfo = user[0];
      
      if (result.success) {
        // Send success notifications
        await this.sendSMSNotification(
          userInfo.email || '',
          `✅ Post published successfully to ${result.platform}! Post ID: ${result.postId}`
        );

        await this.sendEmailNotification(
          userInfo.email || '',
          `Post Published - ${result.platform}`,
          `Your post has been successfully published to ${result.platform}.\n\nPost ID: ${result.postId}\nPlatform: ${result.platform}\nTime: ${new Date().toISOString()}`
        );
      }

    } catch (error) {
      console.error('❌ Failed to send post notifications:', error);
    }
  }

  /**
   * Send failure notification
   */
  private async sendFailureNotification(userId: string, platform: string, error: string) {
    try {
      const user = await db
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (!user.length) return;

      const userInfo = user[0];

      await this.sendSMSNotification(
        userInfo.email || '',
        `❌ Post failed on ${platform}: ${error}`
      );

      await this.sendEmailNotification(
        userInfo.email || '',
        `Post Failed - ${platform}`,
        `Your post failed to publish to ${platform}.\n\nError: ${error}\nTime: ${new Date().toISOString()}\n\nPlease check your ${platform} connection and try again.`
      );

    } catch (error) {
      console.error('❌ Failed to send failure notification:', error);
    }
  }

  /**
   * Send SMS via Twilio
   */
  private async sendSMSNotification(phoneNumber: string, message: string) {
    if (!twilioClient || !process.env.TWILIO_PHONE_NUMBER) {
      console.log('⚠️ Twilio not configured, skipping SMS');
      return;
    }

    try {
      await twilioClient.messages.create({
        body: message,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: phoneNumber
      });

      console.log(`📱 SMS sent to ${phoneNumber}`);
    } catch (error) {
      console.error('❌ SMS sending failed:', error);
    }
  }

  /**
   * Send email via SendGrid
   */
  private async sendEmailNotification(email: string, subject: string, text: string) {
    if (!process.env.SENDGRID_API_KEY || !process.env.SENDGRID_FROM_EMAIL) {
      console.log('⚠️ SendGrid not configured, skipping email');
      return;
    }

    try {
      await sgMail.send({
        to: email,
        from: process.env.SENDGRID_FROM_EMAIL,
        subject,
        text,
        html: `<p>${text.replace(/\n/g, '<br>')}</p>`
      });

      console.log(`📧 Email sent to ${email}`);
    } catch (error) {
      console.error('❌ Email sending failed:', error);
    }
  }
}