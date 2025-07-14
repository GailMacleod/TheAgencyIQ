/**
 * Find All Customers in Stripe
 * Comprehensive search for any duplicate or guest customers
 */

import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  console.error('❌ STRIPE_SECRET_KEY is required');
  process.exit(1);
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

async function findAllCustomers() {
  console.log('🔍 SEARCHING FOR ALL CUSTOMERS IN STRIPE\n');
  
  try {
    // List all customers
    const customers = await stripe.customers.list({
      limit: 100
    });
    
    console.log(`📊 Found ${customers.data.length} total customers:\n`);
    
    let gailCustomers = [];
    let otherCustomers = [];
    
    for (const customer of customers.data) {
      console.log(`📋 Customer: ${customer.id}`);
      console.log(`   Email: ${customer.email || 'N/A'}`);
      console.log(`   Name: ${customer.name || 'N/A'}`);
      console.log(`   Created: ${new Date(customer.created * 1000).toISOString()}`);
      console.log(`   Description: ${customer.description || 'N/A'}`);
      
      // Check if this is related to gailm@macleodglba.com.au
      if (customer.email === 'gailm@macleodglba.com.au' || 
          (customer.name && customer.name.toLowerCase().includes('gail')) ||
          (customer.description && customer.description.toLowerCase().includes('gail'))) {
        console.log(`   ❗ RELATED TO GAIL CUSTOMER`);
        gailCustomers.push(customer);
      } else {
        otherCustomers.push(customer);
      }
      
      // List subscriptions for this customer
      const subscriptions = await stripe.subscriptions.list({
        customer: customer.id,
        limit: 10
      });
      
      console.log(`   📋 Subscriptions: ${subscriptions.data.length}`);
      for (const sub of subscriptions.data) {
        console.log(`      - ${sub.id} (${sub.status}) - ${sub.items.data[0]?.price?.nickname || 'N/A'}`);
      }
      
      // List payment methods
      const paymentMethods = await stripe.paymentMethods.list({
        customer: customer.id,
        limit: 10
      });
      
      console.log(`   💳 Payment Methods: ${paymentMethods.data.length}`);
      for (const pm of paymentMethods.data) {
        console.log(`      - ${pm.id} (${pm.type})`);
      }
      
      console.log(''); // Empty line for readability
    }
    
    console.log('\n🎯 SUMMARY:\n');
    console.log(`📊 Total customers: ${customers.data.length}`);
    console.log(`👤 Gail-related customers: ${gailCustomers.length}`);
    console.log(`👥 Other customers: ${otherCustomers.length}`);
    
    if (gailCustomers.length > 1) {
      console.log('\n❌ FOUND DUPLICATE GAIL CUSTOMERS:');
      for (const customer of gailCustomers) {
        console.log(`   - ${customer.id} (${customer.name || 'No name'}) - ${customer.email || 'No email'}`);
      }
    } else {
      console.log('\n✅ Only one Gail customer found - no duplicates');
    }
    
    // Search for any "Guest" customers
    const guestCustomers = customers.data.filter(c => 
      c.name === 'Guest' || 
      (c.description && c.description.toLowerCase().includes('guest'))
    );
    
    if (guestCustomers.length > 0) {
      console.log('\n🔍 FOUND GUEST CUSTOMERS:');
      for (const customer of guestCustomers) {
        console.log(`   - ${customer.id} (${customer.name || 'No name'}) - ${customer.email || 'No email'}`);
      }
    } else {
      console.log('\n✅ No guest customers found');
    }
    
  } catch (error) {
    console.error('❌ Error searching customers:', error.message);
    process.exit(1);
  }
}

findAllCustomers();