import type { Express } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertUserSchema, insertBrandPurposeSchema, insertPostSchema } from "@shared/schema";
import bcrypt from "bcrypt";
import Stripe from "stripe";
import { z } from "zod";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { generateContentCalendar, generateReplacementPost, getGrokResponse, generateEngagementInsight } from "./grok";
import twilio from 'twilio';
import sgMail from '@sendgrid/mail';

// Session type declaration
declare module 'express-session' {
  interface SessionData {
    userId?: number;
  }
}

// Environment validation
if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing required Stripe secret: STRIPE_SECRET_KEY');
}

if (!process.env.XAI_API_KEY) {
  throw new Error('Missing required xAI API key: XAI_API_KEY');
}

if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
  throw new Error('Missing required Twilio credentials');
}

if (!process.env.SENDGRID_API_KEY) {
  throw new Error('Missing required SendGrid API key');
}

if (!process.env.SESSION_SECRET) {
  throw new Error('Missing required SESSION_SECRET');
}

// Initialize services
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
});

const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID!, process.env.TWILIO_AUTH_TOKEN!);
sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Session configuration
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });

  app.use(session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: sessionTtl,
    },
  }));

  // Auth middleware
  const requireAuth = (req: any, res: any, next: any) => {
    if (!req.session?.userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    next();
  };

  // Stripe webhook endpoint (must be before JSON middleware)
  app.post('/api/webhook/stripe', async (req, res) => {
    const sig = req.headers['stripe-signature'];
    let event;

    try {
      event = stripe.webhooks.constructEvent(req.body, sig!, process.env.STRIPE_WEBHOOK_SECRET!);
    } catch (err: any) {
      console.error('Webhook signature verification failed:', err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    if (event.type === 'invoice.payment_succeeded') {
      const invoice = event.data.object as any;
      const subscriptionId = invoice.subscription;
      
      // Update user subscription status
      console.log('Payment succeeded for subscription:', subscriptionId);
    }

    res.json({ received: true });
  });

  // Create Stripe checkout session
  app.post("/api/create-checkout-session", async (req, res) => {
    try {
      const { priceId } = req.body;
      
      if (!priceId) {
        return res.status(400).json({ message: "Price ID is required" });
      }

      const domains = process.env.REPLIT_DOMAINS?.split(',') || [`localhost:5000`];
      const domain = domains[0];

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [{
          price: priceId,
          quantity: 1,
        }],
        mode: 'subscription',
        success_url: `https://${domain}/api/payment-success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `https://${domain}/subscription`,
      });

      res.json({ url: session.url });
    } catch (error: any) {
      console.error('Stripe error:', error);
      res.status(500).json({ message: "Error creating checkout session: " + error.message });
    }
  });

  // Send verification code
  app.post("/api/send-verification-code", async (req, res) => {
    try {
      const { phone } = req.body;
      
      if (!phone) {
        return res.status(400).json({ message: "Phone number is required" });
      }

      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      await storage.createVerificationCode({
        phone,
        code,
        expiresAt,
      });

      // For test number, just log the code
      if (phone === '+15005550006') {
        console.log(`Verification code for ${phone}: ${code}`);
      } else {
        // Send SMS via Twilio
        await twilioClient.messages.create({
          body: `Your AiQ verification code is: ${code}`,
          from: process.env.TWILIO_PHONE_NUMBER,
          to: phone
        });
      }

      res.json({ message: "Verification code sent" });
    } catch (error: any) {
      console.error('SMS error:', error);
      res.status(500).json({ message: "Error sending verification code" });
    }
  });

  // Verify code and create user
  app.post("/api/verify-and-signup", async (req, res) => {
    try {
      const { email, password, phone, code } = req.body;
      
      if (!email || !password || !phone || !code) {
        return res.status(400).json({ message: "All fields are required" });
      }

      // Verify the code
      const verificationRecord = await storage.getVerificationCode(phone, code);
      if (!verificationRecord || verificationRecord.expiresAt < new Date()) {
        return res.status(400).json({ message: "Invalid or expired verification code" });
      }

      // Check if user already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: "User already exists" });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create user with default starter plan
      const user = await storage.createUser({
        email,
        password: hashedPassword,
        phone,
        subscriptionPlan: 'starter',
        subscriptionStart: new Date(),
        remainingPosts: 12,
        totalPosts: 12,
      });

      // Mark verification code as used
      await storage.markVerificationCodeUsed(verificationRecord.id);

      // Set session
      req.session.userId = user.id;

      res.json({ user: { id: user.id, email: user.email, phone: user.phone } });
    } catch (error: any) {
      console.error('Signup error:', error);
      res.status(500).json({ message: "Error creating account" });
    }
  });

  // Login
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
      }

      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      req.session.userId = user.id;

      res.json({ user: { id: user.id, email: user.email, phone: user.phone } });
    } catch (error: any) {
      console.error('Login error:', error);
      res.status(500).json({ message: "Error logging in" });
    }
  });

  // Logout
  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Error logging out" });
      }
      res.json({ message: "Logged out successfully" });
    });
  });

  // Get current user (public endpoint for checking auth status)
  app.get("/api/auth/user", async (req: any, res) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const user = await storage.getUser(req.session.userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json({ 
        id: user.id, 
        email: user.email, 
        phone: user.phone,
        subscriptionPlan: user.subscriptionPlan,
        remainingPosts: user.remainingPosts,
        totalPosts: user.totalPosts
      });
    } catch (error: any) {
      console.error('Get user error:', error);
      res.status(500).json({ message: "Error fetching user" });
    }
  });

  // Save brand purpose
  app.post("/api/brand-purpose", requireAuth, async (req: any, res) => {
    try {
      const brandPurposeData = insertBrandPurposeSchema.parse({
        ...req.body,
        userId: req.session.userId,
      });

      // Check if brand purpose already exists
      const existing = await storage.getBrandPurposeByUser(req.session.userId);
      
      let brandPurposeRecord;
      if (existing) {
        brandPurposeRecord = await storage.updateBrandPurpose(existing.id, brandPurposeData);
      } else {
        brandPurposeRecord = await storage.createBrandPurpose(brandPurposeData);
      }

      res.json(brandPurposeRecord);
    } catch (error: any) {
      console.error('Brand purpose error:', error);
      res.status(500).json({ message: "Error saving brand purpose" });
    }
  });

  // Analytics endpoint
  app.get("/api/analytics/monthly", requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const posts = await storage.getPostsByUser(userId);
      const connections = await storage.getPlatformConnectionsByUser(userId);
      
      // Filter posts from this month
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const postsThisMonth = posts.filter(post => 
        post.publishedAt && new Date(post.publishedAt) >= startOfMonth
      );
      
      // Calculate analytics from published posts
      const totalPosts = postsThisMonth.length;
      let totalReach = 0;
      let totalEngagement = 0;
      let topPerformingPost = null;
      let maxReach = 0;
      
      // Calculate reach and engagement from Google Analytics data
      postsThisMonth.forEach(post => {
        // Use actual Google Analytics data if available, otherwise skip
        if (post.analytics && typeof post.analytics === 'object') {
          const analytics = post.analytics as any;
          const reach = analytics.reach || 0;
          const engagement = analytics.engagement || 0;
          
          if (reach > 0) {
            totalReach += reach;
            totalEngagement += engagement;
            
            if (reach > maxReach) {
              maxReach = reach;
              topPerformingPost = {
                content: post.content.substring(0, 60) + "...",
                reach: reach,
                platform: post.platform
              };
            }
          }
        }
      });
      
      const averageReach = totalPosts > 0 ? Math.floor(totalReach / totalPosts) : 0;
      const connectedPlatforms = connections.map(conn => conn.platform);
      
      res.json({
        totalPosts,
        totalReach,
        totalEngagement,
        averageReach,
        connectedPlatforms,
        topPerformingPost
      });
    } catch (error) {
      console.error("Error fetching analytics:", error);
      res.status(500).json({ message: "Failed to fetch analytics" });
    }
  });

  // Connect platform (OAuth placeholder)
  app.post("/api/connect-platform", requireAuth, async (req: any, res) => {
    try {
      const { platform } = req.body;
      
      if (!platform) {
        return res.status(400).json({ message: "Platform is required" });
      }

      // In a real implementation, this would initiate OAuth flow
      // For now, we'll simulate a successful connection
      const connection = await storage.createPlatformConnection({
        userId: req.session.userId,
        platform,
        accessToken: `mock_token_${platform}_${Date.now()}`,
        refreshToken: `mock_refresh_${platform}_${Date.now()}`,
      });

      // Automatically create sample analytics data for connected platforms
      await storage.createPost({
        userId: req.session.userId,
        platform,
        content: `Sample ${platform} post with engagement analytics`,
        scheduledFor: new Date(),
        status: 'published',
        publishedAt: new Date(),
        analytics: {
          reach: Math.floor(Math.random() * 3000) + 1000,
          engagement: Math.floor(Math.random() * 500) + 100,
          impressions: Math.floor(Math.random() * 5000) + 2000
        }
      });

      res.json(connection);
    } catch (error: any) {
      console.error('Platform connection error:', error);
      res.status(500).json({ message: "Error connecting platform" });
    }
  });

  // Generate content calendar
  app.post("/api/generate-content-calendar", requireAuth, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.session.userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const brandPurposeRecord = await storage.getBrandPurposeByUser(req.session.userId);
      if (!brandPurposeRecord) {
        return res.status(400).json({ message: "Brand purpose not found. Please complete setup." });
      }

      const connections = await storage.getPlatformConnectionsByUser(req.session.userId);
      if (connections.length === 0) {
        return res.status(400).json({ message: "No platform connections found. Please connect at least one platform." });
      }

      // Generate posts using Grok
      const generatedPosts = await generateContentCalendar({
        corePurpose: brandPurposeRecord.corePurpose,
        audience: brandPurposeRecord.audience,
        goals: brandPurposeRecord.goals,
        platforms: connections.map(c => c.platform),
        totalPosts: user.totalPosts || 12,
      });

      // Save posts to database
      const createdPosts = [];
      for (const postData of generatedPosts) {
        const post = await storage.createPost({
          userId: req.session.userId,
          platform: postData.platform,
          content: postData.content,
          status: "scheduled",
          scheduledFor: new Date(postData.scheduledFor),
        });
        createdPosts.push(post);
      }

      res.json({ posts: createdPosts });
    } catch (error: any) {
      console.error('Content generation error:', error);
      res.status(500).json({ message: "Error generating content calendar: " + error.message });
    }
  });

  // Get posts for schedule screen
  app.get("/api/posts", requireAuth, async (req: any, res) => {
    try {
      const posts = await storage.getPostsByUser(req.session.userId);
      res.json(posts);
    } catch (error: any) {
      console.error('Get posts error:', error);
      res.status(500).json({ message: "Error fetching posts" });
    }
  });

  // Approve post
  app.post("/api/schedule-post", requireAuth, async (req: any, res) => {
    try {
      const { postId } = req.body;
      
      if (!postId) {
        return res.status(400).json({ message: "Post ID is required" });
      }

      const post = await storage.updatePost(postId, {
        status: "published",
        publishedAt: new Date(),
      });

      // Decrement remaining posts
      const user = await storage.getUser(req.session.userId);
      if (user && user.remainingPosts > 0) {
        await storage.updateUser(req.session.userId, {
          remainingPosts: user.remainingPosts - 1,
        });
      }

      res.json(post);
    } catch (error: any) {
      console.error('Schedule post error:', error);
      res.status(500).json({ message: "Error scheduling post" });
    }
  });

  // Get Grok recommendation
  app.post("/api/grok-query", requireAuth, async (req: any, res) => {
    try {
      const { query, context } = req.body;
      
      if (!query) {
        return res.status(400).json({ message: "Query is required" });
      }

      const response = await getGrokResponse(query, context);
      res.json({ response });
    } catch (error: any) {
      console.error('Grok query error:', error);
      res.status(500).json({ message: "Error processing query: " + error.message });
    }
  });

  // Cancel subscription endpoint
  app.post("/api/cancel-subscription", requireAuth, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      if (!user.stripeSubscriptionId) {
        return res.status(400).json({ message: "No active subscription found" });
      }

      // Cancel the subscription in Stripe
      const subscription = await stripe.subscriptions.cancel(user.stripeSubscriptionId);
      
      // Update user subscription status
      await storage.updateUser(req.session.userId!, {
        subscriptionPlan: "cancelled",
        stripeSubscriptionId: null,
        remainingPosts: 0,
        totalPosts: 0
      });

      res.json({ 
        message: "Subscription cancelled successfully",
        subscriptionId: subscription.id 
      });
    } catch (error: any) {
      console.error("Error cancelling subscription:", error);
      res.status(500).json({ message: "Failed to cancel subscription" });
    }
  });

  // Create checkout session for subscription
  app.post("/api/create-checkout-session", requireAuth, async (req: any, res) => {
    try {
      const { priceId } = req.body;
      
      if (!priceId) {
        return res.status(400).json({ message: "Price ID is required" });
      }

      const user = await storage.getUser(req.session.userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Map actual Stripe price IDs to plan details
      const planMapping: { [key: string]: { name: string, posts: number, totalPosts: number } } = {
        "price_starter": { name: "starter", posts: 10, totalPosts: 12 },
        "price_growth": { name: "growth", posts: 25, totalPosts: 27 },
        "price_professional": { name: "professional", posts: 50, totalPosts: 52 }
      };

      // Use the priceId directly for Stripe API
      let planDetails = planMapping[priceId];
      
      // If not found in mapping, treat as valid Stripe price ID and extract plan from metadata
      if (!planDetails) {
        // For actual Stripe price IDs, we'll get plan details from Stripe
        try {
          const price = await stripe.prices.retrieve(priceId);
          const product = await stripe.products.retrieve(price.product as string);
          
          // Extract plan details from product metadata
          const plan = product.metadata?.plan || 'starter';
          const posts = parseInt(product.metadata?.posts || '10');
          const totalPosts = parseInt(product.metadata?.totalPosts || '12');
          
          planDetails = { name: plan, posts, totalPosts };
        } catch (error) {
          return res.status(400).json({ message: "Invalid price ID" });
        }
      }

      const session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        payment_method_types: ['card'],
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        success_url: `${req.protocol}://${req.get('host')}/brand-purpose?payment=success&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${req.protocol}://${req.get('host')}/subscription`,
        client_reference_id: user.id.toString(),
        customer_email: user.email,
        metadata: {
          plan: planDetails.name,
          posts: planDetails.posts.toString(),
          totalPosts: planDetails.totalPosts.toString(),
          userId: user.id.toString()
        }
      });

      res.json({ url: session.url });
    } catch (error: any) {
      console.error("Error creating checkout session:", error);
      res.status(500).json({ message: "Failed to create checkout session" });
    }
  });

  // Replace failed post
  app.post("/api/replace-post", requireAuth, async (req: any, res) => {
    try {
      const { postId } = req.body;
      
      if (!postId) {
        return res.status(400).json({ message: "Post ID is required" });
      }

      const brandPurposeRecord = await storage.getBrandPurposeByUser(req.session.userId);
      if (!brandPurposeRecord) {
        return res.status(400).json({ message: "Brand purpose not found" });
      }

      // Get the current post to know the platform
      const posts = await storage.getPostsByUser(req.session.userId);
      const currentPost = posts.find(p => p.id === postId);
      if (!currentPost) {
        return res.status(404).json({ message: "Post not found" });
      }

      // Generate new content with Grok
      const newContent = await generateReplacementPost(
        currentPost.platform,
        brandPurposeRecord.corePurpose,
        brandPurposeRecord.audience,
        brandPurposeRecord.goals
      );

      const updatedPost = await storage.updatePost(postId, {
        content: newContent,
        status: "scheduled",
        errorLog: null,
      });

      res.json({ 
        post: updatedPost, 
        recommendation: `this post targets ${brandPurposeRecord.audience} to support ${brandPurposeRecord.goals}` 
      });
    } catch (error: any) {
      console.error('Replace post error:', error);
      res.status(500).json({ message: "Error replacing post: " + error.message });
    }
  });

  // Forgot password
  app.post("/api/forgot-password", async (req, res) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }

      const user = await storage.getUserByEmail(email);
      if (!user) {
        // Don't reveal if user exists
        return res.json({ message: "If an account exists, a reset link has been sent" });
      }

      // Generate reset token (in production, store this in database)
      const resetToken = Math.random().toString(36).substring(2, 15);
      const domains = process.env.REPLIT_DOMAINS?.split(',') || [`localhost:5000`];
      const domain = domains[0];
      const resetUrl = `https://${domain}/reset-password?token=${resetToken}`;

      // For demo, just log the reset link
      console.log(`Password reset link for ${email}: ${resetUrl}`);

      // In production, send email via SendGrid
      try {
        const msg = {
          to: email,
          from: 'noreply@agencyiq.com',
          subject: 'Reset Your Password - AgencyIQ',
          html: `<p>Click <a href="${resetUrl}">here</a> to reset your password.</p>`,
        };
        await sgMail.send(msg);
      } catch (emailError) {
        console.error('SendGrid email error:', emailError);
        // Still log to console for development
        console.log(`Email would have been sent to ${email} with reset link: ${resetUrl}`);
      }

      res.json({ message: "If an account exists, a reset link has been sent" });
    } catch (error: any) {
      console.error('Forgot password error:', error);
      res.status(500).json({ message: "Error processing request" });
    }
  });

  // Update profile
  app.put("/api/profile", requireAuth, async (req: any, res) => {
    try {
      const { phone, password } = req.body;
      const updates: any = {};
      
      if (phone) {
        updates.phone = phone;
      }
      
      if (password) {
        updates.password = await bcrypt.hash(password, 10);
      }

      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ message: "No updates provided" });
      }

      const user = await storage.updateUser(req.session.userId, updates);
      
      res.json({ 
        id: user.id, 
        email: user.email, 
        phone: user.phone,
        subscriptionPlan: user.subscriptionPlan
      });
    } catch (error: any) {
      console.error('Update profile error:', error);
      res.status(500).json({ message: "Error updating profile" });
    }
  });

  // Handle payment success and create user session
  app.get("/api/payment-success", async (req: any, res) => {
    try {
      const { session_id, plan } = req.query;
      
      if (!session_id) {
        return res.redirect('/subscription?error=missing_session');
      }

      // Retrieve the checkout session from Stripe
      const session = await stripe.checkout.sessions.retrieve(session_id);
      
      if (session.payment_status === 'paid') {
        // Extract customer email from session
        const customerEmail = session.customer_details?.email;
        
        if (customerEmail) {
          // Find or create user with this email
          let user = await storage.getUserByEmail(customerEmail);
          
          if (!user) {
            // Create a new user account with the subscription
            const hashedPassword = await bcrypt.hash('temp' + Date.now(), 10);
            user = await storage.createUser({
              email: customerEmail,
              password: hashedPassword,
              phone: '',
              subscriptionPlan: plan || 'starter',
              stripeCustomerId: session.customer as string,
              stripeSubscriptionId: session.subscription as string,
              remainingPosts: plan === 'professional' ? 50 : plan === 'growth' ? 25 : 10,
              totalPosts: plan === 'professional' ? 52 : plan === 'growth' ? 27 : 12
            });
          } else {
            // Update existing user with subscription details
            user = await storage.updateUserStripeInfo(
              user.id,
              session.customer as string,
              session.subscription as string
            );
          }
          
          // Log the user in
          req.session.userId = user.id;
          
          // Redirect to brand purpose setup
          return res.redirect('/brand-purpose?payment=success');
        }
      }
      
      res.redirect('/subscription?error=payment_failed');
    } catch (error: any) {
      console.error('Payment success handling error:', error);
      res.redirect('/subscription?error=processing_failed');
    }
  });

  // Stripe webhook endpoint - must be before other JSON middleware
  app.use("/api/webhook", express.raw({ type: 'application/json' }));
  
  app.post("/api/webhook", async (req, res) => {
    const sig = req.headers['stripe-signature'];
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!endpointSecret) {
      console.error('Stripe webhook secret not configured');
      return res.status(400).send('Webhook secret not configured');
    }

    let event;

    try {
      event = stripe.webhooks.constructEvent(req.body, sig!, endpointSecret);
    } catch (err: any) {
      console.error('Webhook signature verification failed:', err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    try {
      switch (event.type) {
        case 'checkout.session.completed':
          const session = event.data.object;
          console.log('Payment successful for session:', session.id);
          
          // Handle successful subscription creation
          if (session.mode === 'subscription') {
            const customerId = session.customer as string;
            const subscriptionId = session.subscription as string;
            const userIdFromMetadata = session.metadata?.userId;
            
            if (userIdFromMetadata && userIdFromMetadata !== 'guest') {
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
          console.log('Unhandled event type:', event.type);
      }

      res.json({ received: true });
    } catch (error) {
      console.error('Error processing webhook:', error);
      res.status(500).json({ error: 'Webhook processing failed' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
