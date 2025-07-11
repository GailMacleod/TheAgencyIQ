/**
 * Activate the new subscription for gailm@macleodglba.com.au
 */

import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
});

async function activateSubscription() {
  console.log('🔥 Activating subscription: sub_1RjgwBS90ymeq6trhbQarOOK');
  
  try {
    // Get the subscription
    const subscription = await stripe.subscriptions.retrieve('sub_1RjgwBS90ymeq6trhbQarOOK');
    console.log(`📋 Current subscription status: ${subscription.status}`);
    
    if (subscription.status === 'incomplete') {
      // Update subscription to active
      const updatedSubscription = await stripe.subscriptions.update('sub_1RjgwBS90ymeq6trhbQarOOK', {
        trial_end: 'now',
        proration_behavior: 'none',
      });
      
      console.log(`✅ Subscription updated: ${updatedSubscription.id}`);
      console.log(`   Status: ${updatedSubscription.status}`);
      console.log(`   Customer: ${updatedSubscription.customer}`);
      
      // Get customer info
      const customer = await stripe.customers.retrieve(updatedSubscription.customer);
      console.log(`   Customer email: ${customer.email}`);
      
      return {
        success: true,
        subscriptionId: updatedSubscription.id,
        status: updatedSubscription.status,
        customerEmail: customer.email
      };
    } else {
      console.log(`✅ Subscription already active: ${subscription.status}`);
      return {
        success: true,
        subscriptionId: subscription.id,
        status: subscription.status
      };
    }
    
  } catch (error) {
    console.error('❌ Error activating subscription:', error.message);
    return false;
  }
}

activateSubscription()
  .then(result => {
    if (result && result.success) {
      console.log('🎉 Subscription activation successful');
      console.log(`✅ Subscription ${result.subscriptionId} is now ${result.status}`);
      process.exit(0);
    } else {
      console.log('❌ Failed to activate subscription');
      process.exit(1);
    }
  });