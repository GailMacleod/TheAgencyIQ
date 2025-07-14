/**
 * COMPREHENSIVE SUBSCRIPTION SERVICE
 * Handles end-to-end subscription management with Stripe integration
 */

import { storage } from '../storage';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  posts: number;
  features: string[];
  stripePriceId: string;
}

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: 'starter',
    name: 'Starter',
    price: 29,
    posts: 10,
    features: ['10 posts/month', 'Basic analytics', '3 platforms'],
    stripePriceId: 'price_starter'
  },
  {
    id: 'professional',
    name: 'Professional',
    price: 99,
    posts: 52,
    features: ['52 posts/month', 'Advanced analytics', '5 platforms', 'AI content'],
    stripePriceId: 'price_professional'
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 299,
    posts: 200,
    features: ['200 posts/month', 'Premium analytics', '5 platforms', 'Priority support'],
    stripePriceId: 'price_enterprise'
  }
];

export class SubscriptionService {
  
  /**
   * Validates that user exists and can subscribe
   */
  async validateUserForSubscription(userId: number): Promise<{ valid: boolean; user?: any; error?: string }> {
    try {
      const user = await storage.getUser(userId);
      
      if (!user) {
        return { valid: false, error: 'User not found' };
      }

      // Check if user already has an active subscription
      if (user.stripeSubscriptionId) {
        // Verify with Stripe that subscription is actually active
        try {
          const subscription = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);
          if (subscription.status === 'active') {
            return { valid: false, error: 'User already has an active subscription' };
          }
        } catch (stripeError) {
          console.log('Stripe subscription not found, allowing new subscription');
        }
      }

      return { valid: true, user };
    } catch (error) {
      console.error('Subscription validation error:', error);
      return { valid: false, error: 'Validation failed' };
    }
  }

  /**
   * Creates authenticated Stripe checkout session
   */
  async createCheckoutSession(userId: number, userEmail: string, planId: string): Promise<{ success: boolean; url?: string; error?: string }> {
    try {
      const plan = SUBSCRIPTION_PLANS.find(p => p.stripePriceId === planId);
      if (!plan) {
        return { success: false, error: 'Invalid subscription plan' };
      }

      // Check for duplicate subscriptions across all customers
      const existingCustomers = await this.findExistingStripeCustomers(userEmail);
      if (existingCustomers.length > 0) {
        return { success: false, error: 'Email already has Stripe account. Contact support.' };
      }

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price: planId,
            quantity: 1,
          },
        ],
        mode: 'subscription',
        success_url: `${process.env.FRONTEND_URL || 'https://app.theagencyiq.ai'}/api/payment-success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.FRONTEND_URL || 'https://app.theagencyiq.ai'}/subscription?cancelled=true`,
        customer_email: userEmail,
        metadata: {
          userId: userId.toString(),
          userEmail: userEmail,
          plan: plan.id,
          posts: plan.posts.toString(),
          totalPosts: plan.posts.toString()
        },
        subscription_data: {
          metadata: {
            userId: userId.toString(),
            userEmail: userEmail,
            plan: plan.id
          }
        }
      });

      return { success: true, url: session.url || undefined };
    } catch (error) {
      console.error('Checkout session creation error:', error);
      return { success: false, error: 'Failed to create checkout session' };
    }
  }

  /**
   * Processes successful payment and updates user subscription
   */
  async processPaymentSuccess(sessionId: string): Promise<{ success: boolean; userId?: number; error?: string }> {
    try {
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      
      if (session.payment_status !== 'paid') {
        return { success: false, error: 'Payment not completed' };
      }

      const userId = parseInt(session.metadata?.userId || '0');
      const userEmail = session.metadata?.userEmail;
      const planId = session.metadata?.plan;

      if (!userId || !userEmail || !planId) {
        return { success: false, error: 'Invalid payment session metadata' };
      }

      // Verify user exists and email matches
      const user = await storage.getUser(userId);
      if (!user || user.email !== userEmail) {
        return { success: false, error: 'User validation failed' };
      }

      const plan = SUBSCRIPTION_PLANS.find(p => p.id === planId);
      if (!plan) {
        return { success: false, error: 'Invalid subscription plan' };
      }

      // Update user with subscription details
      await storage.updateUser(userId, {
        subscriptionPlan: planId,
        subscriptionActive: true,
        stripeSubscriptionId: session.subscription as string,
        stripeCustomerId: session.customer as string,
        remainingPosts: plan.posts,
        totalPosts: plan.posts,
        subscriptionStart: new Date(),
        quotaResetDate: this.getNextQuotaResetDate()
      });

      return { success: true, userId };
    } catch (error) {
      console.error('Payment processing error:', error);
      return { success: false, error: 'Payment processing failed' };
    }
  }

  /**
   * Finds existing Stripe customers by email
   */
  async findExistingStripeCustomers(email: string): Promise<Stripe.Customer[]> {
    try {
      const customers = await stripe.customers.list({
        email: email,
        limit: 10
      });
      return customers.data;
    } catch (error) {
      console.error('Error finding Stripe customers:', error);
      return [];
    }
  }

  /**
   * Cancels duplicate subscriptions
   */
  async cancelDuplicateSubscriptions(keepSubscriptionId: string, userEmail: string): Promise<void> {
    try {
      const customers = await this.findExistingStripeCustomers(userEmail);
      
      for (const customer of customers) {
        const subscriptions = await stripe.subscriptions.list({
          customer: customer.id,
          status: 'active'
        });

        for (const subscription of subscriptions.data) {
          if (subscription.id !== keepSubscriptionId) {
            console.log(`Cancelling duplicate subscription ${subscription.id} for ${userEmail}`);
            await stripe.subscriptions.cancel(subscription.id);
          }
        }
      }
    } catch (error) {
      console.error('Error cancelling duplicate subscriptions:', error);
    }
  }

  /**
   * Gets next quota reset date (30 days from now)
   */
  getNextQuotaResetDate(): Date {
    const resetDate = new Date();
    resetDate.setDate(resetDate.getDate() + 30);
    return resetDate;
  }

  /**
   * Resets user quota on 30-day cycle
   */
  async resetUserQuota(userId: number): Promise<void> {
    try {
      const user = await storage.getUser(userId);
      if (!user || !user.subscriptionPlan) return;

      const plan = SUBSCRIPTION_PLANS.find(p => p.id === user.subscriptionPlan);
      if (!plan) return;

      await storage.updateUser(userId, {
        remainingPosts: plan.posts,
        quotaResetDate: this.getNextQuotaResetDate()
      });

      console.log(`✅ Quota reset for user ${userId}: ${plan.posts} posts`);
    } catch (error) {
      console.error('Quota reset error:', error);
    }
  }

  /**
   * Validates active subscription with Stripe
   */
  async validateActiveSubscription(userId: number): Promise<{ valid: boolean; subscription?: any; error?: string }> {
    try {
      const user = await storage.getUser(userId);
      if (!user || !user.stripeSubscriptionId) {
        return { valid: false, error: 'No subscription found' };
      }

      const subscription = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);
      
      if (subscription.status !== 'active') {
        // Update local database
        await storage.updateUser(userId, {
          subscriptionActive: false
        });
        return { valid: false, error: 'Subscription not active' };
      }

      return { valid: true, subscription };
    } catch (error) {
      console.error('Subscription validation error:', error);
      return { valid: false, error: 'Validation failed' };
    }
  }
}

export const subscriptionService = new SubscriptionService();