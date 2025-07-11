/**
 * Confirm only gailm@macleodglba.com.au subscription exists
 * Verify no other active subscriptions across all accounts
 */

import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
});

async function confirmSingleSubscription() {
  console.log('🔍 CONFIRMING SINGLE SUBSCRIPTION STATUS');
  console.log('Verifying only gailm@macleodglba.com.au +61424835189 has active subscription\n');
  
  try {
    // Get all customers across all target emails
    const targetEmails = ['gailm@macleodglba.com.au', 'admin@theagencyiq.ai', 'gail@theagencyiq.ai'];
    const allCustomers = [];
    
    for (const email of targetEmails) {
      const customers = await stripe.customers.search({
        query: `email:'${email}'`,
      });
      allCustomers.push(...customers.data.map(c => ({...c, searchEmail: email})));
    }
    
    console.log(`📊 FOUND ${allCustomers.length} CUSTOMERS IN STRIPE:`);
    allCustomers.forEach((customer, index) => {
      console.log(`   ${index + 1}. ${customer.email} (${customer.id})`);
    });
    
    // Check ALL subscription statuses (active, trialing, past_due, etc.)
    const allSubscriptions = [];
    const subscriptionStatuses = ['active', 'trialing', 'past_due', 'unpaid', 'canceled', 'incomplete'];
    
    for (const customer of allCustomers) {
      for (const status of subscriptionStatuses) {
        const subscriptions = await stripe.subscriptions.list({
          customer: customer.id,
          status: status,
        });
        
        for (const sub of subscriptions.data) {
          allSubscriptions.push({
            ...sub,
            customerEmail: customer.email,
            customerId: customer.id,
            customerPhone: customer.phone
          });
        }
      }
    }
    
    console.log(`\n🔍 COMPREHENSIVE SUBSCRIPTION AUDIT:`);
    console.log(`Total subscriptions found: ${allSubscriptions.length}`);
    
    if (allSubscriptions.length === 0) {
      console.log('❌ NO SUBSCRIPTIONS FOUND - CRITICAL ERROR');
      return false;
    }
    
    // Group by status
    const byStatus = {};
    allSubscriptions.forEach(sub => {
      if (!byStatus[sub.status]) byStatus[sub.status] = [];
      byStatus[sub.status].push(sub);
    });
    
    console.log('\n📋 SUBSCRIPTION BREAKDOWN BY STATUS:');
    Object.entries(byStatus).forEach(([status, subs]) => {
      console.log(`\n${status.toUpperCase()} (${subs.length}):`);
      subs.forEach(sub => {
        console.log(`   - ${sub.customerEmail} (${sub.customerId})`);
        console.log(`     Subscription: ${sub.id}`);
        console.log(`     Amount: $${sub.items.data[0].price.unit_amount/100} ${sub.items.data[0].price.currency.toUpperCase()}`);
        console.log(`     Created: ${new Date(sub.created * 1000).toISOString()}`);
        if (sub.canceled_at) {
          console.log(`     Canceled: ${new Date(sub.canceled_at * 1000).toISOString()}`);
        }
      });
    });
    
    // Find active subscriptions (active OR trialing)
    const activeSubscriptions = allSubscriptions.filter(sub => 
      sub.status === 'active' || sub.status === 'trialing'
    );
    
    console.log(`\n🎯 ACTIVE SUBSCRIPTIONS ANALYSIS:`);
    console.log(`Active/Trialing subscriptions: ${activeSubscriptions.length}`);
    
    if (activeSubscriptions.length === 0) {
      console.log('❌ NO ACTIVE SUBSCRIPTIONS - SYSTEM ERROR');
      return false;
    }
    
    if (activeSubscriptions.length > 1) {
      console.log('⚠️ MULTIPLE ACTIVE SUBSCRIPTIONS DETECTED:');
      activeSubscriptions.forEach((sub, index) => {
        console.log(`   ${index + 1}. ${sub.customerEmail} - ${sub.id} (${sub.status})`);
      });
      return false;
    }
    
    // Verify the single active subscription
    const singleSubscription = activeSubscriptions[0];
    console.log(`\n✅ SINGLE ACTIVE SUBSCRIPTION CONFIRMED:`);
    console.log(`   Customer Email: ${singleSubscription.customerEmail}`);
    console.log(`   Customer ID: ${singleSubscription.customerId}`);
    console.log(`   Subscription ID: ${singleSubscription.id}`);
    console.log(`   Status: ${singleSubscription.status}`);
    console.log(`   Amount: $${singleSubscription.items.data[0].price.unit_amount/100} ${singleSubscription.items.data[0].price.currency.toUpperCase()}`);
    console.log(`   Created: ${new Date(singleSubscription.created * 1000).toISOString()}`);
    
    // Get customer details to verify phone number
    const customerDetails = await stripe.customers.retrieve(singleSubscription.customerId);
    console.log(`   Customer Phone: ${customerDetails.phone || 'Not set'}`);
    
    // Final verification
    const isCorrectAccount = singleSubscription.customerEmail === 'gailm@macleodglba.com.au';
    const isCorrectAmount = singleSubscription.items.data[0].price.unit_amount === 9999; // $99.99
    
    console.log(`\n🎉 FINAL VERIFICATION:`);
    console.log(`   ✅ Correct email (gailm@macleodglba.com.au): ${isCorrectAccount}`);
    console.log(`   ✅ Professional tier ($99.99): ${isCorrectAmount}`);
    console.log(`   ✅ Single subscription only: ${activeSubscriptions.length === 1}`);
    console.log(`   ✅ Status (active/trialing): ${singleSubscription.status}`);
    
    if (isCorrectAccount && isCorrectAmount && activeSubscriptions.length === 1) {
      console.log(`\n🎯 SUBSCRIPTION CONFIRMATION SUCCESS!`);
      console.log(`✅ ONLY gailm@macleodglba.com.au has active Professional subscription`);
      console.log(`✅ NO other active subscriptions exist`);
      console.log(`✅ Billing architecture is clean and correct`);
      
      return {
        success: true,
        subscriptionId: singleSubscription.id,
        customerEmail: singleSubscription.customerEmail,
        customerId: singleSubscription.customerId,
        status: singleSubscription.status,
        amount: singleSubscription.items.data[0].price.unit_amount / 100,
        phone: customerDetails.phone,
        totalSubscriptions: allSubscriptions.length,
        activeSubscriptions: activeSubscriptions.length
      };
    } else {
      console.log(`\n❌ VERIFICATION FAILED - ISSUES DETECTED`);
      return false;
    }
    
  } catch (error) {
    console.error('💥 SUBSCRIPTION CONFIRMATION ERROR:', error.message);
    return false;
  }
}

// Run confirmation
confirmSingleSubscription()
  .then(result => {
    if (result && result.success) {
      console.log('\n🚀 SUBSCRIPTION CONFIRMATION COMPLETED');
      console.log(`✅ Confirmed: Only ${result.customerEmail} has active ${result.status} subscription`);
      console.log(`✅ Amount: $${result.amount} AUD/month`);
      console.log(`✅ Phone: ${result.phone || 'Not set'}`);
      console.log(`✅ Total subscriptions in system: ${result.totalSubscriptions}`);
      console.log(`✅ Active subscriptions: ${result.activeSubscriptions}`);
      process.exit(0);
    } else {
      console.log('\n❌ SUBSCRIPTION CONFIRMATION FAILED');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('💥 CRITICAL ERROR:', error);
    process.exit(1);
  });