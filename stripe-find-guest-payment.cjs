/**
 * FIND AND DELETE GUEST PAYMENT ACCOUNT
 * Search for the guest account created on June 2nd for payment pi_3RVVpGS90ymeq6tr0rTcKMuo
 */

const Stripe = require('stripe');

class GuestPaymentAccountCleanup {
  constructor() {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    this.targetPaymentIntent = 'pi_3RVVpGS90ymeq6tr0rTcKMuo';
    this.guestDate = new Date('2025-06-02T10:45:00Z');
  }

  async run() {
    console.log('🔍 Searching for guest payment account...');
    console.log(`🎯 Target payment intent: ${this.targetPaymentIntent}`);
    console.log(`📅 Guest creation date: ${this.guestDate}`);
    
    try {
      // Search for the payment intent first
      await this.findPaymentIntent();
      
      // Search for customers created around that date
      await this.searchCustomersByDate();
      
      // Search for any customers with no email
      await this.searchCustomersWithoutEmail();
      
      // Search payment methods
      await this.searchPaymentMethods();
      
    } catch (error) {
      console.error('❌ Guest payment cleanup failed:', error);
      throw error;
    }
  }

  async findPaymentIntent() {
    console.log('\n🔍 Step 1: Finding payment intent...');
    
    try {
      const paymentIntent = await this.stripe.paymentIntents.retrieve(this.targetPaymentIntent);
      console.log(`✅ Found payment intent: ${paymentIntent.id}`);
      console.log(`   Amount: ${paymentIntent.amount} ${paymentIntent.currency}`);
      console.log(`   Status: ${paymentIntent.status}`);
      console.log(`   Customer: ${paymentIntent.customer || 'NO CUSTOMER'}`);
      console.log(`   Created: ${new Date(paymentIntent.created * 1000)}`);
      
      if (paymentIntent.customer) {
        console.log('\n🎯 Found customer associated with payment intent');
        await this.examineCustomer(paymentIntent.customer);
      }
      
    } catch (error) {
      console.error('❌ Payment intent not found:', error.message);
    }
  }

  async searchCustomersByDate() {
    console.log('\n🔍 Step 2: Searching customers by date...');
    
    // Search for customers created on June 2nd
    const june2Start = Math.floor(new Date('2025-06-02T00:00:00Z').getTime() / 1000);
    const june2End = Math.floor(new Date('2025-06-02T23:59:59Z').getTime() / 1000);
    
    const customers = await this.stripe.customers.list({
      created: { gte: june2Start, lte: june2End },
      limit: 100
    });
    
    console.log(`📊 Found ${customers.data.length} customers created on June 2nd`);
    
    for (const customer of customers.data) {
      console.log(`   - ${customer.id} (${customer.email || 'NO EMAIL'}) - Name: ${customer.name || 'NO NAME'}`);
      console.log(`     Created: ${new Date(customer.created * 1000)}`);
      
      // If it's not our target customer, delete it
      if (customer.email !== 'gailm@macleodglba.com.au') {
        console.log(`     🗑️ Deleting guest customer: ${customer.id}`);
        await this.deleteCustomerCompletely(customer);
      }
    }
  }

  async searchCustomersWithoutEmail() {
    console.log('\n🔍 Step 3: Searching customers without email...');
    
    const allCustomers = await this.getAllCustomers();
    const noEmailCustomers = allCustomers.filter(customer => 
      !customer.email || customer.email === ''
    );
    
    console.log(`📊 Found ${noEmailCustomers.length} customers without email`);
    
    for (const customer of noEmailCustomers) {
      console.log(`   - ${customer.id} (NO EMAIL) - Name: ${customer.name || 'NO NAME'}`);
      console.log(`     Created: ${new Date(customer.created * 1000)}`);
      console.log(`     🗑️ Deleting customer without email: ${customer.id}`);
      await this.deleteCustomerCompletely(customer);
    }
  }

  async searchPaymentMethods() {
    console.log('\n🔍 Step 4: Searching payment methods...');
    
    try {
      const paymentMethods = await this.stripe.paymentMethods.list({
        type: 'card',
        limit: 100
      });
      
      console.log(`📊 Found ${paymentMethods.data.length} payment methods`);
      
      for (const pm of paymentMethods.data) {
        console.log(`   - ${pm.id} (${pm.card?.brand} ****${pm.card?.last4})`);
        console.log(`     Customer: ${pm.customer || 'NO CUSTOMER'}`);
        
        if (pm.customer) {
          await this.examineCustomer(pm.customer);
        }
      }
      
    } catch (error) {
      console.error('❌ Error searching payment methods:', error.message);
    }
  }

  async examineCustomer(customerId) {
    try {
      const customer = await this.stripe.customers.retrieve(customerId);
      console.log(`     👤 Customer: ${customer.id}`);
      console.log(`        Email: ${customer.email || 'NO EMAIL'}`);
      console.log(`        Name: ${customer.name || 'NO NAME'}`);
      console.log(`        Created: ${new Date(customer.created * 1000)}`);
      
      // If it's not our target customer, delete it
      if (customer.email !== 'gailm@macleodglba.com.au') {
        console.log(`        🗑️ Deleting non-target customer: ${customer.id}`);
        await this.deleteCustomerCompletely(customer);
      }
      
    } catch (error) {
      console.error(`     ❌ Error examining customer ${customerId}:`, error.message);
    }
  }

  async getAllCustomers() {
    const customers = [];
    let hasMore = true;
    let startingAfter = null;
    
    while (hasMore) {
      const params = { limit: 100 };
      if (startingAfter) {
        params.starting_after = startingAfter;
      }
      
      const response = await this.stripe.customers.list(params);
      customers.push(...response.data);
      
      hasMore = response.has_more;
      if (hasMore && response.data.length > 0) {
        startingAfter = response.data[response.data.length - 1].id;
      }
    }
    
    return customers;
  }

  async deleteCustomerCompletely(customer) {
    try {
      // Cancel all subscriptions first
      const subscriptions = await this.stripe.subscriptions.list({
        customer: customer.id,
        limit: 100
      });
      
      for (const subscription of subscriptions.data) {
        if (subscription.status !== 'canceled') {
          await this.stripe.subscriptions.cancel(subscription.id);
          console.log(`        ✅ Canceled subscription: ${subscription.id}`);
        }
      }
      
      // Delete the customer
      await this.stripe.customers.del(customer.id);
      console.log(`        ✅ DELETED CUSTOMER: ${customer.id}`);
      
    } catch (error) {
      console.error(`        ❌ Error deleting customer ${customer.id}:`, error.message);
    }
  }
}

// Execute cleanup
if (require.main === module) {
  const cleanup = new GuestPaymentAccountCleanup();
  cleanup.run()
    .then(() => {
      console.log('✅ Guest payment account cleanup completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Guest payment account cleanup failed:', error);
      process.exit(1);
    });
}

module.exports = { GuestPaymentAccountCleanup };