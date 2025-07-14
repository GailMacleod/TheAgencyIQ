/**
 * Cancel Guest Customer with Same Email Address
 * Identifies and cancels duplicate guest customer for gailm@macleodglba.com.au
 */

import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  console.error('❌ STRIPE_SECRET_KEY is required');
  process.exit(1);
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

async function cancelGuestCustomer() {
  console.log('🔍 SEARCHING FOR DUPLICATE CUSTOMERS WITH EMAIL: gailm@macleodglba.com.au\n');
  
  try {
    // List all customers with the target email
    const customers = await stripe.customers.list({
      email: 'gailm@macleodglba.com.au',
      limit: 100
    });
    
    console.log(`📊 Found ${customers.data.length} customers with email gailm@macleodglba.com.au:`);
    
    let targetCustomer = null;
    let guestCustomers = [];
    
    for (const customer of customers.data) {
      console.log(`\n📋 Customer: ${customer.id}`);
      console.log(`   Email: ${customer.email}`);
      console.log(`   Name: ${customer.name || 'N/A'}`);
      console.log(`   Created: ${new Date(customer.created * 1000).toISOString()}`);
      
      // Check if this is a guest customer (no name or generic name)
      if (!customer.name || customer.name.includes('Guest') || customer.name === 'gailm@macleodglba.com.au') {
        console.log(`   ❌ IDENTIFIED AS GUEST CUSTOMER`);
        guestCustomers.push(customer);
      } else {
        console.log(`   ✅ IDENTIFIED AS REAL CUSTOMER`);
        targetCustomer = customer;
      }
      
      // List subscriptions for this customer
      const subscriptions = await stripe.subscriptions.list({
        customer: customer.id,
        limit: 10
      });
      
      console.log(`   📋 Subscriptions: ${subscriptions.data.length}`);
      for (const sub of subscriptions.data) {
        console.log(`      - ${sub.id} (${sub.status})`);
      }
    }
    
    console.log('\n🔄 CLEANUP PROCESS:\n');
    
    // Cancel all guest customers
    for (const guestCustomer of guestCustomers) {
      console.log(`❌ Cancelling guest customer: ${guestCustomer.id}`);
      
      // First cancel all subscriptions
      const subscriptions = await stripe.subscriptions.list({
        customer: guestCustomer.id,
        limit: 10
      });
      
      for (const subscription of subscriptions.data) {
        if (subscription.status === 'active') {
          console.log(`   ❌ Cancelling subscription: ${subscription.id}`);
          await stripe.subscriptions.cancel(subscription.id);
        }
      }
      
      // Delete the customer
      console.log(`   🗑️ Deleting customer: ${guestCustomer.id}`);
      await stripe.customers.del(guestCustomer.id);
      console.log(`   ✅ Guest customer ${guestCustomer.id} deleted successfully`);
    }
    
    // Verify final state
    console.log('\n✅ FINAL VERIFICATION:\n');
    
    const finalCustomers = await stripe.customers.list({
      email: 'gailm@macleodglba.com.au',
      limit: 100
    });
    
    console.log(`📊 Remaining customers: ${finalCustomers.data.length}`);
    
    for (const customer of finalCustomers.data) {
      console.log(`✅ Customer: ${customer.id} (${customer.name || 'No name'})`);
      
      const subscriptions = await stripe.subscriptions.list({
        customer: customer.id,
        limit: 10
      });
      
      console.log(`   📋 Active subscriptions: ${subscriptions.data.filter(s => s.status === 'active').length}`);
    }
    
    console.log('\n🎉 GUEST CUSTOMER CLEANUP COMPLETE');
    
  } catch (error) {
    console.error('❌ Error during guest customer cleanup:', error.message);
    process.exit(1);
  }
}

cancelGuestCustomer();