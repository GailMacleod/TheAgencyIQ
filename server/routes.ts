import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertUserSchema, insertBrandPurposeSchema, insertPostSchema } from "@shared/schema";
import bcrypt from "bcrypt";
import Stripe from "stripe";
import { z } from "zod";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { generateContentCalendar, generateReplacementPost, getGrokResponse, generateEngagementInsight } from "./grok";

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
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2023-10-16",
});

// Twilio setup
const twilio = require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

// SendGrid setup
const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

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
    secret: process.env.SESSION_SECRET,
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
        success_url: `https://${domain}/signup?session_id={CHECKOUT_SESSION_ID}`,
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
        await twilio.messages.create({
          body: `Your AgencyIQ verification code is: ${code}`,
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

  // Get current user
  app.get("/api/auth/user", requireAuth, async (req: any, res) => {
    try {
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

  const httpServer = createServer(app);
  return httpServer;
}
