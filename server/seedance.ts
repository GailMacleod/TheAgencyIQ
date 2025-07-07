/**
 * SEEDANCE 1.0 - DEPLOYMENT SYSTEM
 * Implements three subscription tiers with Express.js and OAuth integration
 */

import express from 'express';
import { OAuth2Client } from 'google-auth-library';

const app = express();

// Basic Express setup for Seedance 1.0
app.use(express.json());
app.use(express.static('public'));

// Google OAuth2 configuration for Seedance
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Three subscription tiers for Seedance 1.0
export interface SeedanceSubscription {
  tier: 'starter' | 'growth' | 'professional';
  posts: 12 | 27 | 52;
  price: number;
  features: string[];
}

export const subscriptionTiers: SeedanceSubscription[] = [
  {
    tier: 'starter',
    posts: 12,
    price: 29,
    features: ['Basic AI content', 'Single platform', 'Email support']
  },
  {
    tier: 'growth', 
    posts: 27,
    price: 59,
    features: ['Advanced AI content', '3 platforms', 'Priority support', 'Analytics']
  },
  {
    tier: 'professional',
    posts: 52,
    price: 99,
    features: ['Premium AI content', 'All 5 platforms', 'Dedicated support', 'Advanced analytics', 'Custom branding']
  }
];

// Google OAuth routes for Seedance 1.0
export function setupSeedanceAuth(app: express.Application) {
  // Google OAuth initiation
  app.get('/auth/google', (req, res) => {
    const url = client.generateAuthUrl({
      scope: ['profile', 'email'],
      state: 'seedance-1.0'
    });
    res.redirect(url);
  });

  // Google OAuth callback
  app.get('/auth/google/callback', async (req, res) => {
    try {
      const { code } = req.query;
      const { tokens } = await client.getToken(code as string);
      
      // Store tokens and user info
      client.setCredentials(tokens);
      
      // Get user profile
      const ticket = await client.verifyIdToken({
        idToken: tokens.id_token!,
        audience: process.env.GOOGLE_CLIENT_ID
      });
      
      const payload = ticket.getPayload();
      
      res.json({
        success: true,
        user: {
          id: payload?.sub,
          email: payload?.email,
          name: payload?.name,
          picture: payload?.picture
        },
        seedanceVersion: '1.0'
      });
      
    } catch (error) {
      console.error('OAuth callback error:', error);
      res.status(500).json({ error: 'Authentication failed' });
    }
  });

  // Subscription management for Seedance 1.0
  app.get('/api/subscriptions', (req, res) => {
    res.json({
      tiers: subscriptionTiers,
      seedanceVersion: '1.0',
      features: {
        aiImageGeneration: true,
        textGeneration: true,
        multiPlatform: true,
        quotaEnforcement: true
      }
    });
  });

  // Create subscription
  app.post('/api/subscribe', (req, res) => {
    const { tier, email } = req.body;
    const subscription = subscriptionTiers.find(s => s.tier === tier);
    
    if (!subscription) {
      return res.status(400).json({ error: 'Invalid subscription tier' });
    }

    res.json({
      success: true,
      subscription,
      message: `Subscribed to ${tier} plan with ${subscription.posts} posts`,
      seedanceVersion: '1.0'
    });
  });

  console.log('🌱 Seedance 1.0 OAuth and subscription system initialized');
}

export default {
  setupSeedanceAuth,
  subscriptionTiers
};