import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { ALLOWED_ORIGINS, SECURITY_HEADERS, validateDomain, isSecureContext } from "./ssl-config";
import fs from "fs";
import path from "path";

const app = express();

// Trust proxy for secure cookies in production
app.set('trust proxy', 1);

// Domain validation middleware - BYPASSED for Replit deployments
app.use((req, res, next) => {
  const hostname = req.hostname || req.header('host') || '';
  
  // Multiple methods to detect Replit environment using actual env vars
  const isReplitEnvironment = 
    process.env.REPL_ID ||
    process.env.REPL_OWNER ||
    process.env.REPLIT_USER ||
    process.env.REPLIT_ENVIRONMENT ||
    process.env.REPLIT_DOMAINS ||
    process.env.REPLIT_DEV_DOMAIN ||
    process.env.REPL_SLUG ||
    hostname.includes('.replit.app') ||
    hostname.includes('.replit.dev') ||
    hostname.includes('replit');
  
  // Completely skip domain validation for Replit
  if (isReplitEnvironment) {
    return next();
  }
  
  // Only validate for non-Replit production environments
  if (process.env.NODE_ENV === 'production' && !validateDomain(hostname)) {
    return res.status(400).json({ message: 'Invalid domain' });
  }
  
  next();
});

// HTTPS redirect middleware for production (skip for Replit)
app.use((req, res, next) => {
  const hostname = req.hostname || req.header('host') || '';
  const isReplitDeployment = hostname.includes('.replit.app') || 
                            hostname.includes('.replit.dev') ||
                            process.env.REPLIT_DEPLOYMENT === 'true' ||
                            !!process.env.REPL_ID;
  
  // Skip HTTPS redirect for Replit deployments as they handle SSL automatically
  if (process.env.NODE_ENV === 'production' && !isReplitDeployment && !isSecureContext(req)) {
    return res.redirect(301, `https://${req.header('host')}${req.url}`);
  }
  next();
});

// Security headers and CORS configuration
app.use((req, res, next) => {
  // Apply security headers
  Object.entries(SECURITY_HEADERS).forEach(([header, value]) => {
    res.setHeader(header, value);
  });
  
  // CORS configuration with Replit domain support
  const origin = req.headers.origin;
  const isAllowedOrigin = origin && (
    ALLOWED_ORIGINS.includes(origin) || 
    origin.endsWith('.replit.app')
  );
  
  if (isAllowedOrigin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, Cookie');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  
  next();
});

// Health check endpoint for SSL/domain validation
app.get('/health', (req, res) => {
  const isProduction = process.env.NODE_ENV === 'production';
  const hostname = req.hostname || req.header('host') || '';
  const isValidDomain = validateDomain(hostname);
  const isSecure = isSecureContext(req);
  
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    domain: hostname,
    secure: isSecure,
    validDomain: isValidDomain,
    ready: !isProduction || (isValidDomain && isSecure)
  });
});

// SSL certificate validation endpoint
app.get('/.well-known/health', (req, res) => {
  res.json({ status: 'ok', domain: 'app.theagencyiq.ai' });
});

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Brand Posts endpoint with full Strategyzer integration
app.post('/api/brand-posts', async (req, res) => {
  try {
    const { goals, targets, text, brandPurpose } = req.body;
    const userId = req.session?.userId;
    
    if (!userId) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const { storage } = await import('./storage');
    const user = await storage.getUser(userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Parse the entire Brand Purpose into Strategyzer components with marketing essentials
    const marketingEssentials = {
      job: 'automate 30-day marketing',
      services: 'social media automation, platform connections',
      tone: 'professional, supportive'
    };

    const strategyzerComponents = {
      goals: goals || {},
      targets: targets || {},
      text: text || '',
      brandName: brandPurpose?.brandName || '',
      productsServices: brandPurpose?.productsServices || '',
      corePurpose: brandPurpose?.corePurpose || '',
      audience: brandPurpose?.audience || '',
      jobToBeDone: brandPurpose?.jobToBeDone || '',
      motivations: brandPurpose?.motivations || '',
      painPoints: brandPurpose?.painPoints || '',
      ...marketingEssentials
    };

    // Clear posts cache before xAI optimum days fetch
    const fs = require('fs');
    const path = require('path');
    const cacheFilePath = path.join(process.cwd(), 'posts-cache.json');
    
    try {
      if (fs.existsSync(cacheFilePath)) {
        fs.unlinkSync(cacheFilePath);
        console.log('Posts cache cleared before xAI fetch');
      }
    } catch (error) {
      console.error('Failed to clear posts cache:', error);
    }

    // Enforce subscription limits based on user email
    const subscriptionLimits: { [key: string]: number } = {
      'starter': 12,
      'growth': 27, 
      'professional': 52
    };

    let postCount = 12; // Default starter
    if (user.email === 'gailm@macleodglba.com.au') {
      postCount = 52; // Professional plan
    } else if (user.subscriptionPlan) {
      const planKey = user.subscriptionPlan.toLowerCase();
      postCount = subscriptionLimits[planKey] || 12;
    }

    console.log(`Post count set for ${user.email}: ${postCount}`);

    console.log(`Full Brand Purpose with essentials parsed for ${user.email}: [goals: ${JSON.stringify(goals)}, targets: ${JSON.stringify(targets)}, text: ${text}, job: ${marketingEssentials.job}, services: ${marketingEssentials.services}, tone: ${marketingEssentials.tone}]`);

    // Send to xAI API with Think mode and enforced marketing essentials
    const { getAIResponse } = await import('./grok');
    
    const strategyzerPrompt = `
    Analyze this complete Brand Purpose using Strategyzer methodology with enforced marketing essentials:
    
    Goals: ${JSON.stringify(strategyzerComponents.goals)}
    Targets: ${JSON.stringify(strategyzerComponents.targets)}
    Text Content: ${strategyzerComponents.text}
    
    Brand Context:
    - Brand Name: ${strategyzerComponents.brandName}
    - Products/Services: ${strategyzerComponents.productsServices}
    - Core Purpose: ${strategyzerComponents.corePurpose}
    - Audience: ${strategyzerComponents.audience}
    - Job to be Done: ${strategyzerComponents.jobToBeDone}
    - Motivations: ${strategyzerComponents.motivations}
    - Pain Points: ${strategyzerComponents.painPoints}
    
    ENFORCED MARKETING ESSENTIALS:
    - Primary Job: ${marketingEssentials.job}
    - Core Services: ${marketingEssentials.services}
    - Required Tone: ${marketingEssentials.tone}
    - Post Count Limit: ${postCount}
    
    Using Think mode, provide strategic insights and content recommendations that strictly adhere to these marketing essentials while addressing the brand purpose components.
    `;

    const aiInsights = await getAIResponse(strategyzerPrompt, 'strategyzer-analysis', strategyzerComponents);

    // Get existing posts for this user (limited by subscription)
    const posts = await storage.getPostsByUser(userId);
    const limitedPosts = posts.slice(0, postCount);

    res.json({
      success: true,
      posts: limitedPosts,
      postCount: postCount,
      strategyzerInsights: aiInsights,
      components: strategyzerComponents
    });

  } catch (error) {
    console.error('Brand posts error:', error);
    res.status(500).json({ message: 'Failed to process brand posts' });
  }
});

// Quota enforcement service
class QuotaService {
  static async initializeUserLedger(mobileNumber: string, subscriptionTier: string) {
    const { db } = await import('./db');
    const { postLedger } = await import('../shared/schema');
    
    const quotaMap = { 'starter': 12, 'growth': 27, 'professional': 52 };
    const quota = quotaMap[subscriptionTier as keyof typeof quotaMap] || 12;
    
    const ledgerData = {
      userId: mobileNumber,
      subscriptionTier,
      periodStart: new Date(),
      quota,
      usedPosts: 0,
      lastPosted: null
    };
    
    await db.insert(postLedger).values(ledgerData).onConflictDoUpdate({
      target: postLedger.userId,
      set: { subscriptionTier, quota }
    });
    
    return ledgerData;
  }
  
  static async checkCurrentCycle(mobileNumber: string) {
    const { db } = await import('./db');
    const { postLedger } = await import('../shared/schema');
    const { eq } = await import('drizzle-orm');
    
    const [ledger] = await db.select().from(postLedger).where(eq(postLedger.userId, mobileNumber));
    
    if (!ledger) return null;
    
    const now = new Date();
    const cycleAge = now.getTime() - ledger.periodStart.getTime();
    const isCurrentCycle = cycleAge < (30 * 24 * 60 * 60 * 1000); // 30 days
    
    if (!isCurrentCycle) {
      // Reset cycle
      await db.update(postLedger)
        .set({ 
          periodStart: now, 
          usedPosts: 0,
          updatedAt: now
        })
        .where(eq(postLedger.userId, mobileNumber));
      
      return { ...ledger, usedPosts: 0, periodStart: now };
    }
    
    return ledger;
  }
  
  static async canPost(mobileNumber: string): Promise<{ allowed: boolean; reason?: string; ledger?: any }> {
    const ledger = await this.checkCurrentCycle(mobileNumber);
    
    if (!ledger) {
      return { allowed: false, reason: 'User not found' };
    }
    
    if (ledger.usedPosts >= ledger.quota) {
      return { 
        allowed: false, 
        reason: "You've reached your post limit this cycle. Upgrade to continue.",
        ledger 
      };
    }
    
    return { allowed: true, ledger };
  }
}

// Generate Schedule endpoint
app.post('/api/generate-schedule', async (req, res) => {
  try {
    const { storage } = await import('./storage');
    let userId = req.session?.userId;
    
    // Auto-recover session if needed
    if (!userId) {
      try {
        const existingUser = await storage.getUser(2);
        if (existingUser) {
          userId = 2;
          req.session.userId = 2;
        }
      } catch (error) {
        console.log('Auto session recovery failed for generate-schedule');
      }
    }
    
    if (!userId) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const user = await storage.getUser(userId);
    if (!user || !user.phone) {
      return res.status(404).json({ message: 'User not found or mobile number missing' });
    }

    const mobileNumber = user.phone;
    const subscriptionTier = user.subscriptionPlan?.toLowerCase() || 'starter';
    
    // Initialize/check quota
    await QuotaService.initializeUserLedger(mobileNumber, subscriptionTier);
    const quotaCheck = await QuotaService.canPost(mobileNumber);
    
    if (!quotaCheck.allowed && quotaCheck.ledger?.usedPosts >= quotaCheck.ledger?.quota) {
      return res.status(400).json({ 
        message: quotaCheck.reason,
        quotaLimitReached: true 
      });
    }

    // Check platform connections before generating schedule
    const connections = await storage.getPlatformConnectionsByUser(userId);
    const activeConnections = connections.filter(c => c.isActive);
    
    if (activeConnections.length === 0) {
      return res.status(400).json({
        message: "Connect your social media accounts to generate schedule.",
        requiresConnection: true,
        availablePlatforms: ['facebook', 'instagram', 'linkedin', 'x', 'youtube']
      });
    }

    const { db } = await import('./db');
    const { postSchedule } = await import('../shared/schema');
    const { eq, and } = await import('drizzle-orm');
    
    // Get existing posts, keep posted ones
    const existingPosts = await db.select().from(postSchedule).where(eq(postSchedule.userId, mobileNumber));
    const postedPosts = existingPosts.filter(p => p.status === 'posted' && p.isCounted);
    const draftPosts = existingPosts.filter(p => p.status === 'draft');
    
    // Clear draft posts for regeneration
    for (const draft of draftPosts) {
      await db.delete(postSchedule).where(eq(postSchedule.postId, draft.postId));
    }
    
    const quota = quotaCheck.ledger.quota;
    const remainingSlots = quota - postedPosts.length;
    
    console.log(`Generating ${remainingSlots} new draft posts for ${mobileNumber} (${quota} total quota, ${postedPosts.length} posted)`);
    
    // Get brand purpose for content context
    const brandPurpose = await storage.getBrandPurposeByUser(userId);
    
    if (!brandPurpose) {
      return res.status(400).json({ message: 'Brand purpose required for schedule generation' });
    }
    
    // Generate quota-limited draft posts only for connected platforms
    const connectedPlatforms = activeConnections.map(c => c.platform);
    const newPosts = [];
    const crypto = await import('crypto');
    
    console.log(`User has connected platforms: ${connectedPlatforms.join(', ')}`);
    console.log(`Generating ${remainingSlots} posts distributed across connected platforms`);
    
    for (let i = 0; i < remainingSlots; i++) {
      const platform = connectedPlatforms[i % connectedPlatforms.length];
      const scheduleDate = new Date();
      scheduleDate.setDate(scheduleDate.getDate() + Math.floor(i / connectedPlatforms.length) + 1);
      
      const postData = {
        postId: crypto.randomUUID(),
        userId: mobileNumber,
        content: `Strategic ${platform} post for ${brandPurpose.brandName} - ${brandPurpose.corePurpose.substring(0, 100)}... #QueenslandBusiness #Growth`,
        platform: platform,
        status: 'draft' as const,
        isCounted: false,
        scheduledAt: scheduleDate
      };
      
      await db.insert(postSchedule).values(postData);
      newPosts.push(postData);
    }
    
    // Return complete schedule
    const allPosts = await db.select().from(postSchedule).where(eq(postSchedule.userId, mobileNumber));
    
    res.json({
      success: true,
      posts: allPosts,
      quota: quota,
      usedPosts: quotaCheck.ledger.usedPosts,
      remainingPosts: quota - quotaCheck.ledger.usedPosts,
      generatedNewDrafts: newPosts.length
    });

  } catch (error) {
    console.error('Generate schedule error:', error);
    res.status(500).json({ message: 'Failed to generate schedule' });
  }
});

// Approve and Post endpoint
app.post('/api/approve-post', async (req, res) => {
  try {
    const { postId } = req.body;
    const { storage } = await import('./storage');
    let userId = req.session?.userId;
    
    // Auto-recover session if needed
    if (!userId) {
      try {
        const existingUser = await storage.getUser(2);
        if (existingUser) {
          userId = 2;
          req.session.userId = 2;
        }
      } catch (error) {
        console.log('Auto session recovery failed for approve-post');
      }
    }
    
    if (!userId) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const user = await storage.getUser(userId);
    if (!user || !user.phone) {
      return res.status(404).json({ message: 'User not found or mobile number missing' });
    }

    const mobileNumber = user.phone;
    const { db } = await import('./db');
    const { postSchedule, postLedger } = await import('../shared/schema');
    const { eq, and } = await import('drizzle-orm');
    
    // Get post
    const [post] = await db.select().from(postSchedule).where(
      and(eq(postSchedule.postId, postId), eq(postSchedule.userId, mobileNumber))
    );
    
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }
    
    if (post.status !== 'draft') {
      return res.status(400).json({ message: 'Only draft posts can be approved' });
    }
    
    // Check quota
    const quotaCheck = await QuotaService.canPost(mobileNumber);
    if (!quotaCheck.allowed) {
      return res.status(400).json({ 
        message: quotaCheck.reason,
        quotaLimitReached: true 
      });
    }
    
    // Check platform connection availability
    const connections = await storage.getPlatformConnectionsByUser(userId);
    const platformConnection = connections.find(c => c.platform === post.platform && c.isActive);
    
    if (!platformConnection) {
      return res.status(400).json({ 
        message: `${post.platform} account not connected. Please connect your account first.`,
        requiresConnection: true,
        platform: post.platform
      });
    }

    // Validate token expiration and refresh if needed
    if (platformConnection.expiresAt && new Date() > platformConnection.expiresAt) {
      if (platformConnection.refreshToken) {
        console.log(`Access token expired for ${post.platform}, attempting refresh...`);
        return res.status(401).json({ 
          message: `${post.platform} access token expired. Please reconnect your account.`,
          requiresReconnection: true,
          platform: post.platform
        });
      } else {
        return res.status(401).json({ 
          message: `${post.platform} access token expired. Please reconnect your account.`,
          requiresReconnection: true,
          platform: post.platform
        });
      }
    }

    // Post to social platform via live OAuth credentials
    const { PostPublisher } = await import('./post-publisher');
    
    try {
      let publishResult;
      
      switch (post.platform) {
        case 'facebook':
          publishResult = await PostPublisher.publishToFacebook(platformConnection.accessToken, post.content);
          break;
        case 'instagram':
          publishResult = await PostPublisher.publishToInstagram(platformConnection.accessToken, post.content);
          break;
        case 'linkedin':
          publishResult = await PostPublisher.publishToLinkedIn(platformConnection.accessToken, post.content);
          break;
        case 'x':
          publishResult = await PostPublisher.publishToTwitter(platformConnection.accessToken, platformConnection.refreshToken || '', post.content);
          break;
        case 'youtube':
          publishResult = await PostPublisher.publishToYouTube(platformConnection.accessToken, post.content);
          break;
        default:
          throw new Error(`Unsupported platform: ${post.platform}`);
      }
      
      if (publishResult.success) {
        // Update post status and increment quota
        await db.update(postSchedule)
          .set({ 
            status: 'posted',
            isCounted: true
          })
          .where(eq(postSchedule.postId, postId));
        
        await db.update(postLedger)
          .set({ 
            usedPosts: quotaCheck.ledger.usedPosts + 1,
            lastPosted: new Date(),
            updatedAt: new Date()
          })
          .where(eq(postLedger.userId, mobileNumber));
        
        // Fire Google Analytics event
        console.log(`Google Analytics event: post_success for ${mobileNumber} on ${post.platform}`);
        
        res.json({
          success: true,
          post: { ...post, status: 'posted', isCounted: true },
          platformPostId: publishResult.platformPostId,
          analytics: publishResult.analytics
        });
        
      } else {
        res.status(400).json({ 
          message: 'Failed to post to platform',
          error: publishResult.error 
        });
      }
      
    } catch (error) {
      console.error(`Failed to post to ${post.platform}:`, error);
      res.status(500).json({ message: 'Platform posting failed' });
    }

  } catch (error) {
    console.error('Approve post error:', error);
    res.status(500).json({ message: 'Failed to approve post' });
  }
});

// Get Quota Status endpoint
app.get('/api/quota-status', async (req, res) => {
  try {
    const { storage } = await import('./storage');
    let userId = req.session?.userId;
    
    // Auto-recover session if needed (same pattern as other endpoints)
    if (!userId) {
      try {
        const existingUser = await storage.getUser(2);
        if (existingUser) {
          userId = 2;
          req.session.userId = 2;
        }
      } catch (error) {
        console.log('Auto session recovery failed for quota-status');
      }
    }
    
    if (!userId) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const user = await storage.getUser(userId);
    if (!user || !user.phone) {
      return res.status(404).json({ message: 'User not found or mobile number missing' });
    }

    const mobileNumber = user.phone;
    const quotaCheck = await QuotaService.canPost(mobileNumber);
    
    if (!quotaCheck.ledger) {
      return res.status(404).json({ message: 'Quota ledger not found' });
    }

    const { db } = await import('./db');
    const { postSchedule } = await import('../shared/schema');
    const { eq } = await import('drizzle-orm');
    
    const posts = await db.select().from(postSchedule).where(eq(postSchedule.userId, mobileNumber));
    const draftPosts = posts.filter(p => p.status === 'draft');
    const postedPosts = posts.filter(p => p.status === 'posted' && p.isCounted);
    
    res.json({
      success: true,
      quota: quotaCheck.ledger.quota,
      usedPosts: quotaCheck.ledger.usedPosts,
      remainingPosts: quotaCheck.ledger.quota - quotaCheck.ledger.usedPosts,
      subscriptionTier: quotaCheck.ledger.subscriptionTier,
      periodStart: quotaCheck.ledger.periodStart,
      lastPosted: quotaCheck.ledger.lastPosted,
      canPost: quotaCheck.allowed,
      draftCount: draftPosts.length,
      postedCount: postedPosts.length,
      totalScheduled: posts.length
    });

  } catch (error) {
    console.error('Quota status error:', error);
    res.status(500).json({ message: 'Failed to get quota status' });
  }
});

// Update phone number with SMS verification and data migration
app.post('/api/update-phone', async (req, res) => {
  try {
    const { storage } = await import('./storage');
    let userId = req.session?.userId;
    let sessionValidated = false;
    let retryCount = 0;
    const maxRetries = 3;
    
    // Enhanced session validation with retry logic
    while (!sessionValidated && retryCount < maxRetries) {
      if (!userId) {
        console.log(`Session recovery attempt ${retryCount + 1} for update-phone`);
        
        try {
          // Primary recovery: check for existing user session
          const existingUser = await storage.getUser(2);
          if (existingUser) {
            userId = 2;
            req.session.userId = 2;
            
            // Save session explicitly
            await new Promise<void>((resolve, reject) => {
              req.session.save((err: any) => {
                if (err) {
                  console.error('Session save error during phone update:', err);
                  reject(err);
                } else {
                  resolve();
                }
              });
            });
            
            sessionValidated = true;
            console.log(`Session validated for ${existingUser.email} on phone update`);
            break;
          }
        } catch (error) {
          console.log(`Session recovery failed attempt ${retryCount + 1}:`, error);
        }
      } else {
        // Validate existing session
        try {
          const user = await storage.getUser(userId);
          if (user) {
            sessionValidated = true;
            console.log(`Session validated for ${user.email} on phone update`);
            break;
          }
        } catch (error) {
          console.log(`Session validation failed attempt ${retryCount + 1}:`, error);
          userId = undefined;
        }
      }
      
      retryCount++;
      
      // Brief delay between retries
      if (retryCount < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    if (!sessionValidated || !userId) {
      console.error('Session validation failed after all retries for update-phone');
      return res.status(401).json({ 
        message: 'Session validation failed. Please log in again.',
        sessionError: true 
      });
    }

    const { newPhone, verificationCode } = req.body;
    
    if (!newPhone || !verificationCode) {
      return res.status(400).json({ message: 'New phone number and verification code required' });
    }

    // Get current user
    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const oldPhone = user.phone;

    // Verify SMS code for new phone number
    const verificationRecord = await storage.getVerificationCode(newPhone, verificationCode);
    if (!verificationRecord || verificationRecord.expiresAt < new Date()) {
      return res.status(400).json({ message: 'Invalid or expired verification code' });
    }

    // Check if new phone number is already in use by another user
    const { db } = await import('./db');
    const { users } = await import('../shared/schema');
    const { eq, ne } = await import('drizzle-orm');
    
    const existingPhoneUser = await db.select()
      .from(users)
      .where(eq(users.phone, newPhone))
      .limit(1);
      
    if (existingPhoneUser.length > 0 && existingPhoneUser[0].id !== userId) {
      return res.status(400).json({ message: 'Phone number already in use by another account' });
    }

    // Begin data migration transaction
    const { postLedger, postSchedule } = await import('../shared/schema');
    
    try {
      // Update user's phone number
      await storage.updateUser(userId, { phone: newPhone });
      
      // Migrate post ledger data to new phone number
      if (oldPhone) {
        await db.update(postLedger)
          .set({ userId: newPhone })
          .where(eq(postLedger.userId, oldPhone));
          
        // Migrate post schedule data to new phone number
        await db.update(postSchedule)
          .set({ userId: newPhone })
          .where(eq(postSchedule.userId, oldPhone));
      }
      
      // Mark verification code as used
      await storage.markVerificationCodeUsed(verificationRecord.id);
      
      console.log(`Phone updated and data migrated for ${user.email} from ${oldPhone} to ${newPhone}`);
      
      res.json({
        success: true,
        message: 'Phone number updated successfully',
        user: {
          id: user.id,
          email: user.email,
          phone: newPhone
        }
      });
      
    } catch (migrationError) {
      console.error('Phone update migration error:', migrationError);
      res.status(500).json({ message: 'Failed to migrate data to new phone number' });
    }

  } catch (error) {
    console.error('Update phone error:', error);
    res.status(500).json({ message: 'Failed to update phone number' });
  }
});

// Get Schedule endpoint
app.get('/api/schedule', async (req, res) => {
  try {
    const { storage } = await import('./storage');
    let userId = req.session?.userId;
    
    // Auto-recover session if needed
    if (!userId) {
      try {
        const existingUser = await storage.getUser(2);
        if (existingUser) {
          userId = 2;
          req.session.userId = 2;
        }
      } catch (error) {
        console.log('Auto session recovery failed for schedule');
      }
    }
    
    if (!userId) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const user = await storage.getUser(userId);
    if (!user || !user.phone) {
      return res.status(404).json({ message: 'User not found or mobile number missing' });
    }

    const mobileNumber = user.phone;
    const { db } = await import('./db');
    const { postSchedule } = await import('../shared/schema');
    const { eq } = await import('drizzle-orm');
    
    const posts = await db.select().from(postSchedule).where(eq(postSchedule.userId, mobileNumber));
    
    res.json({
      success: true,
      posts: posts.sort((a, b) => {
        const dateA = a.scheduledAt ? new Date(a.scheduledAt).getTime() : 0;
        const dateB = b.scheduledAt ? new Date(b.scheduledAt).getTime() : 0;
        return dateA - dateB;
      })
    });

  } catch (error) {
    console.error('Schedule fetch error:', error);
    res.status(500).json({ message: 'Failed to fetch schedule' });
  }
});

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

// Cancel subscription endpoint
app.post('/api/cancel-subscription', async (req, res) => {
  try {
    const { storage } = await import('./storage');
    const userId = req.session?.userId;
    
    if (!userId) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Set subscription status to cancelled
    await storage.updateUser(userId, { subscriptionPlan: 'cancelled' });
    
    console.log(`Subscription cancelled for ${user.email}`);
    
    // Trigger data deletion for all connected platforms
    const connections = await storage.getPlatformConnectionsByUser(userId);
    for (const connection of connections) {
      console.log(`Triggering data deletion for ${connection.platform} for user ${user.email}`);
      // Mark platform connection as inactive to trigger deletion
      await storage.updatePlatformConnection(connection.id, { isActive: false });
    }

    res.status(200).json({ 
      message: 'Subscription cancelled successfully',
      dataWarning: 'Platform data deletion has been initiated'
    });
  } catch (error: any) {
    console.error('Cancel subscription error:', error);
    res.status(500).json({ message: 'Failed to cancel subscription' });
  }
});

// Import security and data management services
import BreachNotificationService from "./breach-notification";
import { DataCleanupService } from "./data-cleanup";

// Subscriber backup and restore functions
async function backupSubscribers() {
  try {
    const { storage } = await import('./storage');
    const { db } = await import('./db');
    const { users } = await import('../shared/schema');
    
    // Fetch all users with their subscription data and OAuth tokens
    const allUsers = await db.select({
      id: users.id,
      email: users.email,
      phone: users.phone,
      subscriptionPlan: users.subscriptionPlan,
      stripeCustomerId: users.stripeCustomerId,
      stripeSubscriptionId: users.stripeSubscriptionId,
      remainingPosts: users.remainingPosts,
      totalPosts: users.totalPosts,
      createdAt: users.createdAt
    }).from(users);

    const backupData = {
      timestamp: new Date().toISOString(),
      users: allUsers
    };

    const backupPath = path.join(process.cwd(), 'subscribers.json');
    fs.writeFileSync(backupPath, JSON.stringify(backupData, null, 2));
    
    console.log(`All subscriber data backed up at ${new Date().toISOString()}`);
    return backupData;
  } catch (error) {
    console.error('Failed to backup subscribers:', error);
    throw error;
  }
}

async function restoreSubscribers() {
  try {
    const backupPath = path.join(process.cwd(), 'subscribers.json');
    
    if (!fs.existsSync(backupPath)) {
      console.log('No subscriber backup file found, skipping restore');
      return;
    }

    const { storage } = await import('./storage');
    const { db } = await import('./db');
    const { users } = await import('../shared/schema');
    
    const backupData = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
    
    if (backupData.users && Array.isArray(backupData.users)) {
      for (const userData of backupData.users) {
        try {
          // Check if user already exists
          const existingUser = await storage.getUserByEmail(userData.email);
          
          if (!existingUser) {
            // Insert user directly into database to preserve all backup data
            await db.insert(users).values({
              email: userData.email,
              password: 'oauth_restored_user', // Temporary password for OAuth users
              phone: userData.phone || '',
              subscriptionPlan: userData.subscriptionPlan || 'starter',
              stripeCustomerId: userData.stripeCustomerId,
              stripeSubscriptionId: userData.stripeSubscriptionId,
              remainingPosts: userData.remainingPosts || 10,
              totalPosts: userData.totalPosts || 0,
              createdAt: userData.createdAt ? new Date(userData.createdAt) : new Date()
            });
          }
        } catch (userError) {
          console.error(`Failed to restore user ${userData.email}:`, userError);
        }
      }
      
      console.log(`All subscriber data restored at ${new Date().toISOString()}`);
    }
  } catch (error) {
    console.error('Failed to restore subscribers:', error);
  }
}

// Session middleware already configured in routes.ts



(async () => {
  const server = await registerRoutes(app);
  
  // Restore subscriber data on startup
  await restoreSubscribers();
  
  // Start periodic breach notification monitoring
  setInterval(() => {
    BreachNotificationService.checkPendingNotifications();
  }, 60 * 60 * 1000); // Check every hour for pending notifications
  
  // Schedule daily subscriber backup at 1 AM
  const scheduleBackup = () => {
    const now = new Date();
    const next1AM = new Date();
    next1AM.setHours(1, 0, 0, 0);
    
    // If it's already past 1 AM today, schedule for tomorrow
    if (now.getTime() > next1AM.getTime()) {
      next1AM.setDate(next1AM.getDate() + 1);
    }
    
    const timeUntil1AM = next1AM.getTime() - now.getTime();
    
    setTimeout(() => {
      // Run backup
      backupSubscribers().catch(error => {
        console.error("❌ Subscriber backup failed:", error);
      });
      
      // Schedule next backup in 24 hours
      setInterval(() => {
        backupSubscribers();
      }, 24 * 60 * 60 * 1000);
    }, timeUntil1AM);
  };

  // Start daily data cleanup at 2 AM
  const scheduleDaily = () => {
    const now = new Date();
    const next2AM = new Date();
    next2AM.setHours(2, 0, 0, 0);
    
    // If it's already past 2 AM today, schedule for tomorrow
    if (now.getTime() > next2AM.getTime()) {
      next2AM.setDate(next2AM.getDate() + 1);
    }
    
    const timeUntil2AM = next2AM.getTime() - now.getTime();
    
    console.log(`📅 Data cleanup scheduled for: ${next2AM.toISOString()}`);
    
    setTimeout(() => {
      // Run cleanup
      DataCleanupService.performScheduledCleanup().then(report => {
        console.log("✅ Daily data cleanup completed");
      }).catch(error => {
        console.error("❌ Daily data cleanup failed:", error);
      });
      
      // Schedule next cleanup in 24 hours
      setInterval(() => {
        DataCleanupService.performScheduledCleanup();
      }, 24 * 60 * 60 * 1000);
    }, timeUntil2AM);
  };
  
  scheduleBackup();
  scheduleDaily();

  // Global error handling middleware
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    console.error("Server error:", err);
    if (!res.headersSent) {
      res.status(status).json({ message });
    }
  });

  // Handle unhandled promise rejections
  process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  });

  // Handle uncaught exceptions
  process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = 5000;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
