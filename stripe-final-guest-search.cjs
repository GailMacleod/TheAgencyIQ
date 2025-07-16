/**
 * FINAL COMPREHENSIVE GUEST SEARCH
 * Search for any hidden or deleted guest accounts
 */

const Stripe = require('stripe');

class FinalGuestSearch {
  constructor() {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  }

  async run() {
    console.log('🔍 FINAL COMPREHENSIVE GUEST SEARCH');
    
    try {
      // Strategy 1: Search all customers with expanded data
      await this.searchAllCustomersExpanded();
      
      // Strategy 2: Search deleted customers (if accessible)
      await this.searchDeletedCustomers();
      
      // Strategy 3: Search by payment intent connections
      await this.searchPaymentIntentConnections();
      
      // Strategy 4: List all objects that might reference customers
      await this.listAllReferences();
      
      // Final verification
      await this.finalVerification();
      
    } catch (error) {
      console.error('❌ Final guest search failed:', error);
      throw error;
    }
  }

  async searchAllCustomersExpanded() {
    console.log('\n🔍 Strategy 1: Expanded customer search...');
    
    const customers = await this.stripe.customers.list({
      limit: 100,
      expand: ['data.default_source', 'data.subscriptions']
    });
    
    console.log(`📊 Found ${customers.data.length} customers with expanded data`);
    
    customers.data.forEach((customer, index) => {
      console.log(`${index + 1}. Customer ID: ${customer.id}`);
      console.log(`   Email: ${customer.email || 'NO EMAIL'}`);
      console.log(`   Name: ${customer.name || 'NO NAME'}`);
      console.log(`   Created: ${new Date(customer.created * 1000)}`);
      console.log(`   Deleted: ${customer.deleted || false}`);
      console.log(`   Description: ${customer.description || 'NONE'}`);
      console.log(`   Phone: ${customer.phone || 'NONE'}`);
      console.log(`   Address: ${customer.address ? JSON.stringify(customer.address) : 'NONE'}`);
      console.log(`   Default Source: ${customer.default_source || 'NONE'}`);
      console.log(`   Subscriptions: ${customer.subscriptions?.data?.length || 0}`);
      console.log('   ---');
    });
  }

  async searchDeletedCustomers() {
    console.log('\n🔍 Strategy 2: Searching deleted customers...');
    
    try {
      // Try to access deleted customers (this might not work depending on Stripe API)
      const deletedCustomers = await this.stripe.customers.list({
        limit: 100,
        include: ['deleted']
      });
      
      console.log(`📊 Found ${deletedCustomers.data.length} deleted customers`);
      
      deletedCustomers.data.forEach((customer, index) => {
        if (customer.deleted) {
          console.log(`${index + 1}. DELETED Customer: ${customer.id}`);
          console.log(`   Email: ${customer.email || 'NO EMAIL'}`);
          console.log(`   Name: ${customer.name || 'NO NAME'}`);
          console.log(`   Deleted: ${customer.deleted}`);
        }
      });
      
    } catch (error) {
      console.log('   ⚠️ Deleted customers not accessible via API');
    }
  }

  async searchPaymentIntentConnections() {
    console.log('\n🔍 Strategy 3: Payment intent connections...');
    
    // Search payment intents from June 2nd
    const june2Start = Math.floor(new Date('2025-06-02T00:00:00Z').getTime() / 1000);
    const june2End = Math.floor(new Date('2025-06-02T23:59:59Z').getTime() / 1000);
    
    const paymentIntents = await this.stripe.paymentIntents.list({
      created: { gte: june2Start, lte: june2End },
      limit: 100
    });
    
    console.log(`📊 Found ${paymentIntents.data.length} payment intents from June 2nd`);
    
    for (const pi of paymentIntents.data) {
      console.log(`   Payment Intent: ${pi.id}`);
      console.log(`   Amount: ${pi.amount} ${pi.currency}`);
      console.log(`   Status: ${pi.status}`);
      console.log(`   Customer: ${pi.customer || 'NO CUSTOMER'}`);
      console.log(`   Created: ${new Date(pi.created * 1000)}`);
      
      if (pi.customer) {
        try {
          const customer = await this.stripe.customers.retrieve(pi.customer);
          console.log(`   → Customer Details: ${customer.id} (${customer.email})`);
        } catch (error) {
          console.log(`   → Customer not found: ${pi.customer}`);
        }
      }
      console.log('   ---');
    }
  }

  async listAllReferences() {
    console.log('\n🔍 Strategy 4: All object references...');
    
    // Check charges
    const charges = await this.stripe.charges.list({
      limit: 10
    });
    
    console.log(`📊 Recent charges: ${charges.data.length}`);
    charges.data.forEach(charge => {
      console.log(`   Charge: ${charge.id} - Customer: ${charge.customer || 'NO CUSTOMER'}`);
    });
    
    // Check invoices
    const invoices = await this.stripe.invoices.list({
      limit: 10
    });
    
    console.log(`📊 Recent invoices: ${invoices.data.length}`);
    invoices.data.forEach(invoice => {
      console.log(`   Invoice: ${invoice.id} - Customer: ${invoice.customer || 'NO CUSTOMER'}`);
    });
    
    // Check subscriptions
    const subscriptions = await this.stripe.subscriptions.list({
      limit: 10
    });
    
    console.log(`📊 Recent subscriptions: ${subscriptions.data.length}`);
    subscriptions.data.forEach(subscription => {
      console.log(`   Subscription: ${subscription.id} - Customer: ${subscription.customer}`);
    });
  }

  async finalVerification() {
    console.log('\n🔍 FINAL VERIFICATION');
    
    const customers = await this.stripe.customers.list({ limit: 100 });
    
    console.log(`📊 TOTAL CUSTOMERS IN SYSTEM: ${customers.data.length}`);
    
    if (customers.data.length === 1) {
      const customer = customers.data[0];
      console.log('✅ SINGLE CUSTOMER CONFIRMED:');
      console.log(`   ID: ${customer.id}`);
      console.log(`   Email: ${customer.email}`);
      console.log(`   Name: ${customer.name}`);
      console.log(`   Created: ${new Date(customer.created * 1000)}`);
      
      if (customer.email === 'gailm@macleodglba.com.au') {
        console.log('✅ CORRECT TARGET CUSTOMER CONFIRMED');
      } else {
        console.log('❌ WRONG CUSTOMER - NOT TARGET EMAIL');
      }
    } else {
      console.log(`❌ MULTIPLE CUSTOMERS STILL EXIST: ${customers.data.length}`);
    }
  }
}

// Execute final search
if (require.main === module) {
  const search = new FinalGuestSearch();
  search.run()
    .then(() => {
      console.log('✅ Final guest search completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Final guest search failed:', error);
      process.exit(1);
    });
}

module.exports = { FinalGuestSearch };