import { storage } from '../storage';
import { SUBSCRIPTION_PLANS } from './subscription';

export async function createMockSubscription(userId: number, planId: string, email: string) {
  const user = await storage.getUser(userId);
  if (!user) {
    throw new Error('User not found');
  }

  const plan = SUBSCRIPTION_PLANS.find(p => p.id === planId);
  if (!plan) {
    throw new Error('Invalid subscription plan');
  }

  // Create mock subscription data
  const mockSubscription = {
    id: `sub_mock_${Date.now()}`,
    customer: `cus_mock_${Date.now()}`,
    status: 'active',
    current_period_start: Math.floor(Date.now() / 1000),
    current_period_end: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60), // 30 days from now
    latest_invoice: {
      payment_intent: {
        client_secret: `pi_mock_${Date.now()}_secret`
      }
    }
  };

  // Update user with mock subscription info
  await storage.updateUser(userId, {
    stripeCustomerId: mockSubscription.customer,
    stripeSubscriptionId: mockSubscription.id,
    subscriptionPlan: planId,
    subscriptionActive: true,
    remainingPosts: plan.posts,
    totalPosts: plan.posts,
    subscriptionStart: new Date()
  });

  return {
    subscription: mockSubscription,
    clientSecret: mockSubscription.latest_invoice.payment_intent.client_secret
  };
}