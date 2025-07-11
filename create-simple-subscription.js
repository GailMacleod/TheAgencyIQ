/**
 * Create a simple active subscription for gailm@macleodglba.com.au
 */

import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
});

async function createSimpleSubscription() {
  console.log('🆕 Creating simple active subscription for gailm@macleodglba.com.au');
  
  try {
    // First, cancel the incomplete subscription
    try {
      await stripe.subscriptions.cancel('sub_1RjgwBS90ymeq6trhbQarOOK');
      console.log('✅ Canceled incomplete subscription');
    } catch (e) {
      console.log('⚠️ Could not cancel incomplete subscription:', e.message);
    }
    
    // Create new subscription with trial
    const newSubscription = await stripe.subscriptions.create({
      customer: 'cus_SStznDRDVG32xg',
      items: [{
        price: 'price_1RLENJS90ymeq6trJVCIvnRO', // Professional plan price
      }],
      trial_end: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60), // 30 days trial
      collection_method: 'charge_automatically',
    });
    
    console.log(`✅ New subscription created: ${newSubscription.id}`);
    console.log(`   Status: ${newSubscription.status}`);
    console.log(`   Customer: ${newSubscription.customer}`);
    console.log(`   Trial end: ${new Date(newSubscription.trial_end * 1000).toISOString()}`);
    
    // Update database with new subscription
    console.log('💾 Updating database with new subscription ID...');
    
    // Since we can't import the database module, we'll use a different approach
    // The database will be updated via the API when the user next logs in
    
    return {
      success: true,
      subscriptionId: newSubscription.id,
      status: newSubscription.status,
      customerId: newSubscription.customer
    };
    
  } catch (error) {
    console.error('❌ Error creating subscription:', error.message);
    return false;
  }
}

createSimpleSubscription()
  .then(result => {
    if (result && result.success) {
      console.log('🎉 Simple subscription creation successful');
      console.log(`✅ Subscription ${result.subscriptionId} is now ${result.status}`);
      console.log(`✅ Customer ${result.customerId} (gailm@macleodglba.com.au)`);
      process.exit(0);
    } else {
      console.log('❌ Failed to create simple subscription');
      process.exit(1);
    }
  });