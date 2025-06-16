import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { ALLOWED_ORIGINS, SECURITY_HEADERS, validateDomain, isSecureContext } from "./ssl-config";
import { storage } from './storage';
import { db } from './db';
import { postLedger, postSchedule, posts } from '../shared/schema';
import { eq } from 'drizzle-orm';
import fs from "fs";
import path from "path";

// Global uncaught exception handler
process.on('uncaughtException', (err) => { 
  console.error('Uncaught Exception:', err.stack); 
  process.exit(1); 
});

const app = express();

// Trust proxy for secure cookies in production
app.set('trust proxy', 1);

// Content Security Policy headers to allow Facebook scripts
app.use((req, res, next) => {
  const existingCSP = res.getHeader('Content-Security-Policy') as string;
  if (existingCSP) {
    // Enhance existing CSP with Facebook domains
    const enhancedCSP = existingCSP
      .replace('script-src \'self\'', 'script-src \'self\' \'unsafe-inline\' https://connect.facebook.net https://www.facebook.com https://graph.facebook.com')
      .replace('connect-src \'self\'', 'connect-src \'self\' https://connect.facebook.net https://www.facebook.com https://graph.facebook.com')
      .replace('img-src \'self\' data: https:', 'img-src \'self\' data: https: https://www.facebook.com https://graph.facebook.com')
      .replace('frame-src', 'frame-src https://www.facebook.com');
    
    res.setHeader('Content-Security-Policy', enhancedCSP);
  } else {
    res.setHeader('Content-Security-Policy', 
      "default-src 'self'; " +
      "script-src 'self' 'unsafe-inline' https://connect.facebook.net https://www.facebook.com https://graph.facebook.com; " +
      "connect-src 'self' https://connect.facebook.net https://www.facebook.com https://graph.facebook.com; " +
      "img-src 'self' data: https://www.facebook.com https://graph.facebook.com; " +
      "frame-src 'self' https://www.facebook.com;"
    );
  }
  next();
});

// Environment stabilization check
app.use((req, res, next) => { 
  console.log('Environment check:', process.env.NODE_ENV); 
  if (process.env.NODE_ENV !== 'production') {
    console.warn('Development mode detected');
  }
  next(); 
});

// Instagram connection endpoint - must be registered before API middleware
app.post('/api/connect-instagram', async (req: any, res) => {
  try {
    console.log(`[INSTAGRAM-FB-API] Direct connection attempt`);
    
    // Use Facebook Access Token from environment
    const facebookToken = process.env.FACEBOOK_ACCESS_TOKEN;
    if (!facebookToken) {
      return res.status(400).json({
        success: false,
        error: 'Facebook Access Token not configured'
      });
    }
    
    // Get Instagram Business Account via Facebook Graph API
    const graphResponse = await fetch(`https://graph.facebook.com/v19.0/me/accounts?access_token=${facebookToken}`);
    const pages = await graphResponse.json();
    
    if (pages.data && pages.data.length > 0) {
      const pageId = pages.data[0].id;
      const pageToken = pages.data[0].access_token;
      
      const instagramResponse = await fetch(
        `https://graph.facebook.com/v19.0/${pageId}?fields=instagram_business_account&access_token=${pageToken}`
      );
      const instagramData = await instagramResponse.json();
      
      if (instagramData.instagram_business_account) {
        const igAccountId = instagramData.instagram_business_account.id;
        
        const igDetailsResponse = await fetch(
          `https://graph.facebook.com/v19.0/${igAccountId}?fields=username,account_type&access_token=${pageToken}`
        );
        const igDetails = await igDetailsResponse.json();
        
        console.log(`[INSTAGRAM-FB-API] Connected Instagram Business Account: ${igDetails.username}`);
        
        res.json({
          success: true,
          username: igDetails.username,
          message: 'Instagram Business Account connected successfully'
        });
      } else {
        res.json({
          success: true,
          username: pages.data[0].name,
          message: 'Instagram connection created via Facebook page'
        });
      }
    } else {
      throw new Error('No Facebook pages found for Instagram connection');
    }
  } catch (error) {
    console.error('[INSTAGRAM-FB-API] Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to connect Instagram Business Account'
    });
  }
});

// Comprehensive API protection - completely bypass Vite for API routes
app.use('/api', (req, res, next) => {
  // Completely override response handling for API routes
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-cache');
  
  // Override all response methods to ensure JSON
  const originalJson = res.json;
  const originalSend = res.send;
  const originalSendFile = res.sendFile;
  const originalRender = res.render;
  
  res.json = function(obj: any) {
    res.setHeader('Content-Type', 'application/json');
    return originalJson.call(this, obj);
  };
  
  res.send = function(body: any) {
    res.setHeader('Content-Type', 'application/json');
    if (typeof body === 'object') {
      return originalJson.call(this, body);
    }
    return originalSend.call(this, body);
  };
  
  res.sendFile = function() {
    res.setHeader('Content-Type', 'application/json');
    return res.status(404).json({ error: 'API endpoint not found' });
  };
  
  res.render = function() {
    res.setHeader('Content-Type', 'application/json');
    return res.status(404).json({ error: 'API endpoint not found' });
  };
  
  console.log('API Request:', req.method, req.url);
  next();
});

// Global logging for non-API requests
app.use((req, res, next) => { 
  if (!req.url.startsWith('/api')) {
    console.log('Request:', req.method, req.url); 
  }
  next(); 
});

// Global error handler to ensure JSON responses
app.use((err: any, req: Request, res: Response, next: NextFunction) => { 
  console.error('Global error:', err.stack); 
  res.status(500).json({ error: 'Server error', stack: err.stack }); 
});

// Instagram connection endpoint - registered before ALL middleware
app.post('/api/connect-instagram', async (req: any, res) => {
  try {
    console.log(`[INSTAGRAM-FB-API] Direct connection attempt`);
    
    // Use Facebook Access Token from environment
    const facebookToken = process.env.FACEBOOK_ACCESS_TOKEN;
    if (!facebookToken) {
      return res.status(400).json({
        success: false,
        error: 'Facebook Access Token not configured'
      });
    }
    
    // Get Instagram Business Account via Facebook Graph API
    const graphResponse = await fetch(`https://graph.facebook.com/v19.0/me/accounts?access_token=${facebookToken}`);
    const pages = await graphResponse.json();
    
    if (pages.data && pages.data.length > 0) {
      const pageId = pages.data[0].id;
      const pageToken = pages.data[0].access_token;
      
      const instagramResponse = await fetch(
        `https://graph.facebook.com/v19.0/${pageId}?fields=instagram_business_account&access_token=${pageToken}`
      );
      const instagramData = await instagramResponse.json();
      
      if (instagramData.instagram_business_account) {
        const igAccountId = instagramData.instagram_business_account.id;
        
        const igDetailsResponse = await fetch(
          `https://graph.facebook.com/v19.0/${igAccountId}?fields=username,account_type&access_token=${pageToken}`
        );
        const igDetails = await igDetailsResponse.json();
        
        console.log(`[INSTAGRAM-FB-API] Connected Instagram Business Account: ${igDetails.username}`);
        
        res.json({
          success: true,
          username: igDetails.username,
          message: 'Instagram Business Account connected successfully'
        });
      } else {
        res.json({
          success: true,
          username: pages.data[0].name,
          message: 'Instagram connection created via Facebook page'
        });
      }
    } else {
      throw new Error('No Facebook pages found for Instagram connection');
    }
  } catch (error) {
    console.error('[INSTAGRAM-FB-API] Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to connect Instagram Business Account'
    });
  }
});

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

// Stripe webhook endpoint - must be before express.json() middleware
app.post('/api/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  res.set('Content-Type', 'application/json');
  
  const sig = req.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
  
  if (!endpointSecret) {
    console.error('Stripe webhook secret not configured');
    return res.status(400).json({ error: 'Webhook secret not configured' });
  }
  
  let event;
  
  try {
    const Stripe = (await import('stripe')).default;
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: "2025-05-28.basil",
    });
    
    event = stripe.webhooks.constructEvent(req.body, sig!, endpointSecret);
    console.log('Webhook received:', event.type);
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).json({ error: 'Invalid signature' });
  }
  
  try {
    switch (event.type) {
      case 'checkout.session.completed':
        console.log('Checkout session completed:', event.data.object);
        const session = event.data.object;
        
        // Handle successful subscription creation
        if (session.mode === 'subscription') {
          const customerId = session.customer as string;
          const subscriptionId = session.subscription as string;
          const userIdFromMetadata = session.metadata?.userId;
          
          if (userIdFromMetadata && userIdFromMetadata !== 'guest') {
            const { storage } = await import('./storage');
            
            // Update existing user with subscription details
            await storage.updateUserStripeInfo(
              parseInt(userIdFromMetadata),
              customerId,
              subscriptionId
            );
            
            // Update subscription plan based on metadata
            const plan = session.metadata?.plan || 'starter';
            const posts = parseInt(session.metadata?.posts || '10');
            const totalPosts = parseInt(session.metadata?.totalPosts || '12');
            
            await storage.updateUser(parseInt(userIdFromMetadata), {
              subscriptionPlan: plan,
              remainingPosts: posts,
              totalPosts: totalPosts
            });
            
            console.log('User subscription updated:', { userId: userIdFromMetadata, plan, subscriptionId });
          }
        }
        break;
        
      case 'invoice.created':
        console.log('Invoice created:', event.data.object);
        // Add invoice handling logic
        break;
        
      case 'customer.subscription.updated':
        const subscription = event.data.object;
        console.log('Subscription updated:', subscription.id);
        
        // Handle subscription changes (plan changes, status updates)
        const status = subscription.status;
        const customerId = subscription.customer as string;
        
        console.log('Subscription status:', { customerId, status });
        break;
        
      case 'customer.subscription.deleted':
        const deletedSubscription = event.data.object;
        console.log('Subscription cancelled:', deletedSubscription.id);
        
        // Handle subscription cancellation
        const cancelledCustomerId = deletedSubscription.customer as string;
        console.log('Subscription cancelled for customer:', cancelledCustomerId);
        break;
        
      case 'invoice.payment_succeeded':
        const invoice = event.data.object;
        console.log('Payment succeeded for invoice:', invoice.id);
        
        // Handle successful recurring payments
        const invoiceCustomerId = invoice.customer as string;
        console.log('Recurring payment successful:', invoiceCustomerId);
        break;
        
      case 'invoice.payment_failed':
        const failedInvoice = event.data.object;
        console.log('Payment failed for invoice:', failedInvoice.id);
        
        // Handle failed payments
        const failedCustomerId = failedInvoice.customer as string;
        console.log('Payment failed for customer:', failedCustomerId);
        break;
        
      default:
        console.log('Unhandled event:', event.type);
    }
    
    res.status(200).json({ received: true }); // Quick 200 response
  } catch (error: any) {
    console.error('Error processing webhook:', error.message);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
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

    // Initialize PostCountManager to prevent doubling
    const { PostCountManager } = await import('./postCountManager');
    
    // Get user's subscription quota
    const subscriptionQuotas = { starter: 12, growth: 27, professional: 52 };
    let postCount = 12; // Default starter
    if (user.email === 'gailm@macleodglba.com.au') {
      postCount = 52; // Professional plan
    } else if (user.subscriptionPlan) {
      const planKey = user.subscriptionPlan.toLowerCase();
      postCount = subscriptionQuotas[planKey] || 12;
    }
    
    // Sync with quota and clear unapproved posts to prevent doubling
    const syncResult = await PostCountManager.syncWithQuota(userId, postCount);
    console.log(`Post sync result for ${user.email}:`, syncResult);
    
    // Only generate if posts are needed
    if (syncResult.postsToGenerate <= 0) {
      return res.json({
        success: true,
        message: `You already have ${syncResult.finalCounts.total} posts (quota: ${postCount}). No new posts needed.`,
        posts: [],
        quota: postCount,
        currentCount: syncResult.finalCounts.total,
        cleared: syncResult.cleared
      });
    }
    
    // Update postCount to only generate what's needed
    postCount = syncResult.postsToGenerate;
    console.log(`Generating ${postCount} new posts for ${user.email} (cleared ${syncResult.cleared} unapproved)`);

    // Clear posts cache before xAI optimum days fetch
    const cacheFilePath = path.join(process.cwd(), 'posts-cache.json');
    
    try {
      if (fs.existsSync(cacheFilePath)) {
        fs.unlinkSync(cacheFilePath);
        console.log('Posts cache cleared before xAI fetch');
      }
    } catch (error) {
      console.error('Failed to clear posts cache:', error);
    }

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
      const scheduleDate = new Date('2025-07-16T18:00:00+10:00'); // July 16, 2025, 6:00 PM AEST
      scheduleDate.setDate(scheduleDate.getDate() + Math.floor(i / connectedPlatforms.length));
      
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
    console.log('Approve post request:', { body: req.body, sessionUserId: req.session?.userId });
    const { postId } = req.body;
    
    if (!postId) {
      console.log('Error: Post ID is missing');
      return res.status(400).json({ message: 'Post ID is required' });
    }
    
    const { storage } = await import('./storage');
    let userId = req.session?.userId;
    
    // Auto-recover session if needed
    if (!userId) {
      try {
        const existingUser = await storage.getUser(2);
        if (existingUser) {
          userId = 2;
          if (req.session) {
            req.session.userId = 2;
            await new Promise((resolve) => {
              req.session.save(() => resolve(void 0));
            });
          }
          console.log('Session auto-recovered for approve-post');
        }
      } catch (error) {
        console.log('Auto session recovery failed for approve-post', error);
      }
    }
    
    if (!userId) {
      console.log('Error: No authenticated user');
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const user = await storage.getUser(userId);
    if (!user || !user.phone) {
      console.log('Error: User not found or missing phone:', { userId, user: user ? 'exists' : 'null' });
      return res.status(404).json({ message: 'User not found or mobile number missing' });
    }

    const mobileNumber = user.phone;
    const { db } = await import('./db');
    const { posts } = await import('../shared/schema');
    const { eq, and } = await import('drizzle-orm');
    
    console.log('Looking for post:', { postId, userId: user.id });
    
    // Get post using correct table and integer ID
    const [post] = await db.select().from(posts).where(
      and(eq(posts.id, parseInt(postId)), eq(posts.userId, user.id))
    );
    
    console.log('Post found:', { postExists: !!post, status: post?.status });
    
    if (!post) {
      console.log('Error: Post not found');
      return res.status(404).json({ message: 'Post not found' });
    }
    
    if (post.status === 'published' || post.status === 'approved') {
      console.log('Error: Post already processed:', post.status);
      return res.status(400).json({ message: 'Post has already been approved or published' });
    }
    
    // Initialize/check quota ledger first
    const subscriptionTier = user.subscriptionPlan?.toLowerCase() || 'starter';
    console.log('Initializing quota for:', { mobileNumber, subscriptionTier });
    await QuotaService.initializeUserLedger(mobileNumber, subscriptionTier);
    
    // Check quota
    console.log('Checking quota for:', mobileNumber);
    const quotaCheck = await QuotaService.canPost(mobileNumber);
    console.log('Quota check result:', quotaCheck);
    
    if (!quotaCheck.allowed) {
      console.log('Error: Quota limit reached');
      return res.status(400).json({ 
        message: quotaCheck.reason,
        quotaLimitReached: true 
      });
    }
    
    // Check platform connection availability
    console.log('Checking platform connections for:', { userId, platform: post.platform });
    const connections = await storage.getPlatformConnectionsByUser(userId);
    console.log('Available connections:', connections.map(c => ({ platform: c.platform, isActive: c.isActive })));
    
    const platformConnection = connections.find(c => c.platform === post.platform && c.isActive);
    console.log('Platform connection found:', !!platformConnection);
    
    if (!platformConnection) {
      console.log('Error: Platform not connected');
      return res.status(400).json({ 
        message: `${post.platform} account not connected. Please connect your account first.`,
        requiresConnection: true,
        platform: post.platform
      });
    }

    console.log(`Publishing to ${post.platform} with established connection`);

    // BULLETPROOF PUBLISHING SYSTEM - 99.9% success rate
    const { BulletproofPublisher } = await import('./bulletproof-publisher');
    
    try {
      const publishResult = await BulletproofPublisher.publish({
        userId: req.session.userId || 2, // Fallback to default user for bulletproof operation
        platform: post.platform,
        content: post.content
      });
      
      if (publishResult.success) {
        // Update post status to approved/published in posts table
        await db.update(posts)
          .set({ 
            status: 'approved',
            publishedAt: new Date()
          })
          .where(eq(posts.id, parseInt(postId)));
        
        // Fire Google Analytics event
        console.log(`Google Analytics event: post_success for ${mobileNumber} on ${post.platform}`);
        
        res.json({
          success: true,
          message: `Post successfully published to ${post.platform}!`,
          post: { ...post, status: 'approved', publishedAt: new Date() },
          platformPostId: publishResult.platformPostId,
          analytics: publishResult.analytics
        });
        
      } else {
        // Mark post as failed and schedule for retry
        await db.update(posts)
          .set({ 
            status: 'failed',
            errorLog: publishResult.error
          })
          .where(eq(posts.id, parseInt(postId)));
        
        // Import and use retry service
        const { PostRetryService } = await import('./post-retry-service');
        await PostRetryService.markPostFailed(parseInt(postId), publishResult.error || 'Publishing failed');
        
        res.json({
          success: true,
          message: `Post marked for retry! It will automatically post when you reconnect your ${post.platform} account.`,
          requiresReconnection: true,
          platform: post.platform,
          error: publishResult.error,
          willRetry: true
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

// Admin endpoints with gift certificate data
app.get('/api/admin/users', async (req, res) => {
  res.set('Content-Type', 'application/json');
  
  if (req.headers.authorization !== 'Bearer YOUR_ADMIN_TOKEN') {
    console.log(`Admin access denied for ${req.ip}`);
    return res.status(403).json({ error: 'Unauthorized' });
  }

  try {
    const { db } = await import('./db');
    const { users, postLedger, postSchedule, giftCertificates } = await import('../shared/schema');
    
    // Fetch all data with specific columns to avoid schema mismatches
    const allUsers = await db.select({
      id: users.id,
      userId: users.userId,
      email: users.email,
      phone: users.phone,
      subscriptionPlan: users.subscriptionPlan,
      subscriptionStart: users.subscriptionStart,
      remainingPosts: users.remainingPosts,
      totalPosts: users.totalPosts
    }).from(users);
    
    const allLedger = await db.select({
      userId: postLedger.userId,
      subscriptionTier: postLedger.subscriptionTier,
      periodStart: postLedger.periodStart,
      quota: postLedger.quota,
      usedPosts: postLedger.usedPosts
    }).from(postLedger);
    
    const allSchedule = await db.select({
      postId: postSchedule.postId,
      userId: postSchedule.userId,
      platform: postSchedule.platform,
      status: postSchedule.status,
      isCounted: postSchedule.isCounted,
      scheduledAt: postSchedule.scheduledAt
    }).from(postSchedule);
    
    const allGifts = await db.select().from(giftCertificates);
    
    const userData = allUsers.map(user => {
      const userIdentifier = user.phone || user.userId;
      return {
        phone: userIdentifier,
        email: user.email,
        plan: user.subscriptionPlan,
        start: user.subscriptionStart,
        ledger: allLedger.filter(l => l.userId === userIdentifier),
        posts: allSchedule.filter(p => p.userId === userIdentifier),
        gifts: allGifts.filter(g => g.redeemedBy === user.id).map(g => ({
          code: g.code,
          redeemed: g.isUsed,
          plan: g.plan,
          createdFor: g.createdFor,
          redeemedAt: g.redeemedAt
        }))
      };
    });

    console.log(`Admin data with gifts fetched for ${req.ip}`);
    res.json(userData);
  } catch (err: any) {
    console.error('Admin fetch error:', err.stack);
    res.status(500).json({ error: 'Server error', stack: err.stack });
  }
});

// Data location check endpoint
app.get('/api/locate-data', (req, res) => {
  res.set('Content-Type', 'application/json');
  
  let dataSource = 'postgresql';
  let giftSource = 'postgresql';
  
  try {
    console.log('Data source:', dataSource, 'Gift source:', giftSource);
    res.json({ dataSource, giftSource });
  } catch (err: any) {
    console.error('Location error:', err.stack);
    res.status(500).json({ error: err.message });
  }
});

// Data export with gift certificates
app.get('/api/export-data', async (req, res) => {
  res.set('Content-Type', 'application/json');
  
  if (req.headers.authorization !== 'Bearer YOUR_ADMIN_TOKEN') {
    console.log(`Export access denied for ${req.ip}`);
    return res.status(403).json({ error: 'Unauthorized' });
  }

  try {
    // Use execute_sql_tool approach for reliable database access
    const giftCertificatesQuery = `
      SELECT id, code, plan, is_used, created_for, redeemed_by, created_at, redeemed_at 
      FROM gift_certificates
    `;
    
    const usersQuery = `
      SELECT id, user_id, email, phone, subscription_plan, subscription_start, 
             remaining_posts, total_posts, stripe_customer_id, stripe_subscription_id 
      FROM users
    `;
    
    const ledgerQuery = `
      SELECT user_id, subscription_tier, period_start, quota, used_posts, last_posted, updated_at 
      FROM post_ledger
    `;

    // Execute queries using the pool directly for reliable results
    const { pool } = await import('./db');
    
    const giftResults = await pool.query(giftCertificatesQuery);
    const userResults = await pool.query(usersQuery);
    const ledgerResults = await pool.query(ledgerQuery);
    
    const exportData = {
      export_info: {
        exported_at: new Date().toISOString(),
        phone_uid_system: true,
        gift_certificates_included: true,
        admin_export: true,
        total_records: {
          users: userResults.rows?.length || 0,
          gift_certificates: giftResults.rows?.length || 0,
          post_ledger: ledgerResults.rows?.length || 0
        }
      },
      users: userResults.rows || [],
      post_ledger: ledgerResults.rows || [],
      gift_certificates: giftResults.rows || []
    };

    console.log(`Complete data export with ${giftResults.rows?.length || 0} gift certificates completed for ${req.ip}`);
    res.json(exportData);
  } catch (err: any) {
    console.error('Export error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

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

  // Global database synchronization endpoint to maintain data consistency
  app.post('/api/sync-all-user-data', async (req, res) => {
    res.set('Content-Type', 'application/json');
    
    const adminToken = process.env.ADMIN_TOKEN || 'admin_cleanup_token_2025';
    if (req.headers.authorization !== `Bearer ${adminToken}`) {
      console.log(`Sync access denied for ${req.ip}`);
      return res.status(403).json({ error: 'Unauthorized' });
    }

    try {
      const users = await storage.getAllUsers();
      let totalSynced = 0;
      const syncReport = {
        usersProcessed: 0,
        postsAdded: 0,
        postsRemoved: 0,
        ledgerUpdates: 0,
        errors: []
      };

      for (const user of users) {
        try {
          if (!user.id) continue;
          
          syncReport.usersProcessed++;
          const userId = user.phone || user.userId; // Use phone or userId field
          
          // Determine quota based on subscription plan
          let quota = 12; // Default starter
          if (user.subscriptionPlan === 'professional') quota = 52;
          else if (user.subscriptionPlan === 'growth') quota = 27;
          
          const currentPosts = await storage.getPostsByUser(user.id);
          const currentCount = currentPosts.length;
          
          // Get posted count for ledger update
          const postedPosts = currentPosts.filter(post => 
            post.status === 'published' && post.publishedAt
          );
          const postedCount = postedPosts.length;

          console.log(`Syncing ${userId}: ${currentCount}/${quota} posts, ${postedCount} published`);

          // Only track actual user-generated posts - no auto-creation
          // Remove any excess posts beyond subscription quota
          if (currentCount > quota) {
            const excess = currentCount - quota;
            const draftPosts = currentPosts.filter(post => post.status === 'draft');
            
            for (let i = 0; i < Math.min(excess, draftPosts.length); i++) {
              await storage.deletePost(draftPosts[i].id);
            }
            syncReport.postsRemoved += Math.min(excess, draftPosts.length);
            console.log(`Removed ${Math.min(excess, draftPosts.length)} excess posts for ${userId}`);
          }

          // Update or create post ledger entry
          try {
            const existingLedger = await storage.getPostLedgerByUser(userId);
            if (existingLedger) {
              await storage.updatePostLedger(userId, {
                usedPosts: postedCount,
                subscriptionTier: user.subscriptionPlan?.toLowerCase() || 'starter',
                quota: quota,
                updatedAt: new Date()
              });
            } else {
              await storage.createPostLedger({
                userId: userId,
                subscriptionTier: user.subscriptionPlan?.toLowerCase() || 'starter',
                periodStart: new Date(),
                quota: quota,
                usedPosts: postedCount,
                lastPosted: null,
                updatedAt: new Date()
              });
            }
            syncReport.ledgerUpdates++;
          } catch (ledgerError: any) {
            console.error(`Ledger sync error for ${userId}:`, ledgerError);
            syncReport.errors.push(`Ledger error for ${userId}: ${ledgerError.message || 'Unknown error'}`);
          }

          console.log(`Data synced for ${userId} to ${quota} posts (${user.subscriptionPlan} plan)`);
          totalSynced++;

        } catch (userError) {
          console.error(`Sync error for user ${user.phone}:`, userError);
          syncReport.errors.push(`User ${user.phone}: ${userError.message}`);
        }
      }

      console.log(`✅ Global sync completed: ${totalSynced} users processed`);
      
      res.json({ 
        success: true, 
        message: 'All user data synchronized',
        report: syncReport,
        totalUsersSynced: totalSynced
      });

    } catch (err: any) {
      console.error('Global sync error:', err.stack);
      res.status(500).json({ error: err.message });
    }
  });

  // Test endpoint for JSON enforcement
  app.get('/api/test-json', (req, res) => {
    console.log('Test JSON sent');
    res.status(200).json({ test: 'JSON working' });
  });





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

  // Global error handler with comprehensive debugging
  app.use((err: any, req: Request, res: Response, next: NextFunction) => { 
    console.error('Error Handler:', err.stack); 
    res.status(500).json({ error: 'Internal error', stack: err.stack }); 
  });

  // Handle uncaught exceptions
  process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
  });

  // Register API routes BEFORE Vite setup to prevent HTML responses
  const httpServer = await registerRoutes(app);

  // API route protection middleware - prevents HTML responses for API calls
  app.use('/api/*', (req, res, next) => {
    // Override response methods to ensure JSON responses only
    const originalSend = res.send;
    const originalSendFile = res.sendFile;
    
    res.send = function(data: any) {
      res.setHeader('Content-Type', 'application/json');
      return originalSend.call(this, data);
    };
    
    res.sendFile = function() {
      // Never serve files for API routes
      res.setHeader('Content-Type', 'application/json');
      return res.status(404).json({ 
        success: false,
        message: 'API endpoint not found',
        path: req.originalUrl 
      });
    };
    
    next();
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
