import Stripe from 'stripe';
import { storage } from '../storage';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is required');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  posts: number;
  features: string[];
}

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: 'starter',
    name: 'Starter',
    price: 29,
    posts: 20,
    features: ['20 posts per month', 'Basic analytics', 'Email support']
  },
  {
    id: 'growth',
    name: 'Growth',
    price: 49,
    posts: 35,
    features: ['35 posts per month', 'Advanced analytics', 'Priority support']
  },
  {
    id: 'professional',
    name: 'Professional',
    price: 79,
    posts: 52,
    features: ['52 posts per month', 'Premium analytics', 'Phone support', 'Custom branding']
  }
];

export async function createSubscription(userId: number, planId: string, email: string) {
  const user = await storage.getUser(userId);
  if (!user) {
    throw new Error('User not found');
  }

  const plan = SUBSCRIPTION_PLANS.find(p => p.id === planId);
  if (!plan) {
    throw new Error('Invalid subscription plan');
  }

  // Create or retrieve Stripe customer
  let customer;
  if (user.stripeCustomerId) {
    customer = await stripe.customers.retrieve(user.stripeCustomerId);
  } else {
    customer = await stripe.customers.create({
      email: email,
      name: user.email,
      metadata: { userId: userId.toString() }
    });
    
    // Update user with Stripe customer ID
    await storage.updateStripeCustomerId(userId, customer.id);
  }

  // Create subscription with payment intent
  const subscription = await stripe.subscriptions.create({
    customer: customer.id,
    items: [{
      price_data: {
        currency: 'usd',
        product_data: {
          name: `TheAgencyIQ ${plan.name} Plan`,
          description: plan.features.join(', ')
        },
        unit_amount: plan.price * 100,
        recurring: {
          interval: 'month'
        }
      }
    }],
    payment_behavior: 'default_incomplete',
    payment_settings: {
      save_default_payment_method: 'on_subscription'
    },
    expand: ['latest_invoice.payment_intent']
  });

  // Update user with subscription info
  await storage.updateUserStripeInfo(userId, customer.id, subscription.id);
  await storage.set30DayQuotaCycle(userId, plan.posts);

  return {
    subscription,
    clientSecret: subscription.latest_invoice?.payment_intent?.client_secret
  };
}

export async function cancelSubscription(userId: number) {
  const user = await storage.getUser(userId);
  if (!user || !user.stripeSubscriptionId) {
    throw new Error('No active subscription found');
  }

  // Cancel the subscription
  await stripe.subscriptions.cancel(user.stripeSubscriptionId);

  // Update user record
  await storage.updateUser(userId, {
    stripeSubscriptionId: null,
    subscriptionActive: false,
    subscriptionPlan: 'free',
    remainingPosts: 0,
    totalPosts: 0
  });

  return { success: true };
}

export async function getSubscriptionStatus(userId: number) {
  const user = await storage.getUser(userId);
  if (!user || !user.stripeSubscriptionId) {
    return { active: false, plan: 'free' };
  }

  try {
    const subscription = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);
    return {
      active: subscription.status === 'active',
      plan: user.subscriptionPlan,
      status: subscription.status,
      currentPeriodEnd: subscription.current_period_end,
      posts: {
        total: user.totalPosts,
        remaining: user.remainingPosts
      }
    };
  } catch (error) {
    console.error('Error fetching subscription:', error);
    return { active: false, plan: 'free' };
  }
}

export async function handleStripeWebhook(event: Stripe.Event) {
  switch (event.type) {
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
      const subscription = event.data.object as Stripe.Subscription;
      const customer = await stripe.customers.retrieve(subscription.customer as string);
      
      if (customer.deleted) return;
      
      const userId = customer.metadata?.userId;
      if (userId) {
        await storage.updateUser(parseInt(userId), {
          subscriptionActive: subscription.status === 'active',
          subscriptionPlan: subscription.status === 'active' ? 'professional' : 'free'
        });
      }
      break;
      
    case 'customer.subscription.deleted':
      const deletedSubscription = event.data.object as Stripe.Subscription;
      const deletedCustomer = await stripe.customers.retrieve(deletedSubscription.customer as string);
      
      if (deletedCustomer.deleted) return;
      
      const deletedUserId = deletedCustomer.metadata?.userId;
      if (deletedUserId) {
        await storage.updateUser(parseInt(deletedUserId), {
          subscriptionActive: false,
          subscriptionPlan: 'free',
          remainingPosts: 0,
          totalPosts: 0
        });
      }
      break;
      
    case 'invoice.payment_succeeded':
      const invoice = event.data.object as Stripe.Invoice;
      if (invoice.subscription) {
        const invoiceSubscription = await stripe.subscriptions.retrieve(invoice.subscription as string);
        const invoiceCustomer = await stripe.customers.retrieve(invoiceSubscription.customer as string);
        
        if (invoiceCustomer.deleted) return;
        
        const invoiceUserId = invoiceCustomer.metadata?.userId;
        if (invoiceUserId) {
          // Reset quota on successful payment
          const user = await storage.getUser(parseInt(invoiceUserId));
          if (user) {
            const plan = SUBSCRIPTION_PLANS.find(p => p.id === user.subscriptionPlan);
            if (plan) {
              await storage.set30DayQuotaCycle(parseInt(invoiceUserId), plan.posts);
            }
          }
        }
      }
      break;
  }
}