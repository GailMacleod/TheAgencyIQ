/**
 * Subscription Service - Enhanced with Stripe Webhook Quota Reset
 * Handles subscription management and quota resets via Stripe webhooks
 */

import { storage } from '../storage';
import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing required Stripe secret: STRIPE_SECRET_KEY');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
});

export class SubscriptionService {
  
  /**
   * Reset user quota to 52 posts based on subscription tier
   * Called from Stripe webhook on invoice.payment_succeeded
   */
  static async resetUserQuota(userId: number, subscriptionPlan: string = 'professional'): Promise<boolean> {
    try {
      console.log(`🔄 Resetting quota for user ${userId} (${subscriptionPlan})`);
      
      const quotaLimits = {
        free: 5,
        professional: 52,
        enterprise: 200
      };
      
      const newQuotaLimit = quotaLimits[subscriptionPlan] || 52;
      
      // Reset quota in database
      await storage.updateUserQuota(userId, {
        remainingPosts: newQuotaLimit,
        totalPosts: newQuotaLimit,
        quotaResetDate: new Date().toISOString()
      });
      
      console.log(`✅ Quota reset successful: ${newQuotaLimit} posts for user ${userId}`);
      return true;
      
    } catch (error) {
      console.error('❌ Quota reset failed:', error);
      return false;
    }
  }
  
  /**
   * Handle Stripe webhook events for subscription management
   */
  static async handleStripeWebhook(event: Stripe.Event): Promise<void> {
    console.log(`📧 Processing Stripe webhook: ${event.type}`);
    
    try {
      switch (event.type) {
        case 'invoice.payment_succeeded':
          await this.handleInvoicePaymentSucceeded(event);
          break;
          
        case 'customer.subscription.created':
          await this.handleSubscriptionCreated(event);
          break;
          
        case 'customer.subscription.updated':
          await this.handleSubscriptionUpdated(event);
          break;
          
        case 'customer.subscription.deleted':
          await this.handleSubscriptionDeleted(event);
          break;
          
        default:
          console.log(`🔄 Unhandled webhook event: ${event.type}`);
      }
      
    } catch (error) {
      console.error('❌ Webhook processing error:', error);
      throw error;
    }
  }
  
  /**
   * Handle successful invoice payment - reset quota
   */
  private static async handleInvoicePaymentSucceeded(event: Stripe.Event): Promise<void> {
    const invoice = event.data.object as Stripe.Invoice;
    const customerId = invoice.customer as string;
    
    try {
      // Find user by Stripe customer ID
      const user = await storage.getUserByStripeCustomerId(customerId);
      if (!user) {
        console.log(`⚠️  No user found for customer ID: ${customerId}`);
        return;
      }
      
      // Reset quota based on subscription tier
      const subscriptionPlan = user.subscriptionPlan || 'professional';
      await this.resetUserQuota(user.id, subscriptionPlan);
      
      console.log(`✅ Quota reset triggered by invoice payment for user ${user.id}`);
      
    } catch (error) {
      console.error('❌ Invoice payment processing error:', error);
    }
  }
  
  /**
   * Handle subscription creation
   */
  private static async handleSubscriptionCreated(event: Stripe.Event): Promise<void> {
    const subscription = event.data.object as Stripe.Subscription;
    const customerId = subscription.customer as string;
    
    try {
      const user = await storage.getUserByStripeCustomerId(customerId);
      if (!user) {
        console.log(`⚠️  No user found for customer ID: ${customerId}`);
        return;
      }
      
      // Update user subscription status
      await storage.updateUserSubscription(user.id, {
        subscriptionActive: true,
        subscriptionPlan: 'professional',
        stripeSubscriptionId: subscription.id
      });
      
      // Reset quota for new subscription
      await this.resetUserQuota(user.id, 'professional');
      
      console.log(`✅ New subscription created for user ${user.id}`);
      
    } catch (error) {
      console.error('❌ Subscription creation error:', error);
    }
  }
  
  /**
   * Handle subscription updates
   */
  private static async handleSubscriptionUpdated(event: Stripe.Event): Promise<void> {
    const subscription = event.data.object as Stripe.Subscription;
    const customerId = subscription.customer as string;
    
    try {
      const user = await storage.getUserByStripeCustomerId(customerId);
      if (!user) {
        console.log(`⚠️  No user found for customer ID: ${customerId}`);
        return;
      }
      
      // Update subscription status based on Stripe status
      const isActive = subscription.status === 'active';
      await storage.updateUserSubscription(user.id, {
        subscriptionActive: isActive,
        stripeSubscriptionId: subscription.id
      });
      
      if (isActive) {
        // Reset quota if subscription reactivated
        await this.resetUserQuota(user.id, user.subscriptionPlan || 'professional');
      }
      
      console.log(`✅ Subscription updated for user ${user.id} - Active: ${isActive}`);
      
    } catch (error) {
      console.error('❌ Subscription update error:', error);
    }
  }
  
  /**
   * Handle subscription deletion/cancellation
   */
  private static async handleSubscriptionDeleted(event: Stripe.Event): Promise<void> {
    const subscription = event.data.object as Stripe.Subscription;
    const customerId = subscription.customer as string;
    
    try {
      const user = await storage.getUserByStripeCustomerId(customerId);
      if (!user) {
        console.log(`⚠️  No user found for customer ID: ${customerId}`);
        return;
      }
      
      // Deactivate subscription
      await storage.updateUserSubscription(user.id, {
        subscriptionActive: false,
        subscriptionPlan: 'free'
      });
      
      // Reset to free tier quota
      await this.resetUserQuota(user.id, 'free');
      
      console.log(`✅ Subscription cancelled for user ${user.id}`);
      
    } catch (error) {
      console.error('❌ Subscription deletion error:', error);
    }
  }
  
  /**
   * Manual quota reset for testing
   */
  static async manualQuotaReset(userId: number): Promise<boolean> {
    try {
      const user = await storage.getUser(userId);
      if (!user) {
        console.log(`❌ User not found: ${userId}`);
        return false;
      }
      
      return await this.resetUserQuota(userId, user.subscriptionPlan || 'professional');
      
    } catch (error) {
      console.error('❌ Manual quota reset error:', error);
      return false;
    }
  }
  
  /**
   * Get user subscription status
   */
  static async getSubscriptionStatus(userId: number): Promise<any> {
    try {
      const user = await storage.getUser(userId);
      if (!user) {
        return { active: false, plan: 'free' };
      }
      
      return {
        active: user.subscriptionActive,
        plan: user.subscriptionPlan,
        remainingPosts: user.remainingPosts,
        totalPosts: user.totalPosts,
        stripeCustomerId: user.stripeCustomerId,
        stripeSubscriptionId: user.stripeSubscriptionId
      };
      
    } catch (error) {
      console.error('❌ Get subscription status error:', error);
      return { active: false, plan: 'free' };
    }
  }
}

export { SubscriptionService as subscriptionService };