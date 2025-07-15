import { Router } from 'express';
import { createSubscription, cancelSubscription, getSubscriptionStatus, handleStripeWebhook, SUBSCRIPTION_PLANS } from './subscription';
import { createMockSubscription } from './mock-subscription';
import { requireAuth } from '../middleware/authGuard';
import { storage } from '../storage';
import Stripe from 'stripe';

const router = Router();

// Get subscription plans
router.get('/plans', (req, res) => {
  res.json({ plans: SUBSCRIPTION_PLANS });
});

// Create subscription
router.post('/create-subscription', requireAuth, async (req: any, res) => {
  try {
    const { planId } = req.body;
    const userId = req.session.userId;
    
    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const result = await createSubscription(userId, planId, user.email);
    res.json(result);
  } catch (error) {
    console.error('Subscription creation error:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Subscription creation failed' });
  }
});

// Cancel subscription
router.post('/cancel-subscription', requireAuth, async (req: any, res) => {
  try {
    const userId = req.session.userId;
    const result = await cancelSubscription(userId);
    res.json(result);
  } catch (error) {
    console.error('Subscription cancellation error:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Subscription cancellation failed' });
  }
});

// Get subscription status
router.get('/status', requireAuth, async (req: any, res) => {
  try {
    const userId = req.session.userId;
    const status = await getSubscriptionStatus(userId);
    res.json(status);
  } catch (error) {
    console.error('Subscription status error:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to get subscription status' });
  }
});

// Stripe webhook handler
router.post('/webhook', async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
  
  if (!endpointSecret) {
    return res.status(400).json({ error: 'Webhook secret not configured' });
  }
  
  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
    const event = stripe.webhooks.constructEvent(req.body, sig!, endpointSecret);
    
    await handleStripeWebhook(event);
    res.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(400).json({ error: 'Webhook signature verification failed' });
  }
});

export default router;