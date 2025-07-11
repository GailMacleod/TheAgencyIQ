/**
 * Cancel the old subscription that was incorrectly kept
 */

import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
});

async function cancelOldSubscription() {
  console.log('🚫 Canceling old subscription: sub_1RXwGCS90ymeq6trNambE81q');
  
  try {
    const canceledSubscription = await stripe.subscriptions.cancel('sub_1RXwGCS90ymeq6trNambE81q');
    console.log(`✅ Old subscription canceled: ${canceledSubscription.id}`);
    console.log(`   Status: ${canceledSubscription.status}`);
    console.log(`   Canceled at: ${new Date(canceledSubscription.canceled_at * 1000).toISOString()}`);
    
    return true;
  } catch (error) {
    console.error('❌ Error canceling old subscription:', error.message);
    return false;
  }
}

cancelOldSubscription()
  .then(success => {
    if (success) {
      console.log('🎉 Old subscription successfully canceled');
      process.exit(0);
    } else {
      console.log('❌ Failed to cancel old subscription');
      process.exit(1);
    }
  });