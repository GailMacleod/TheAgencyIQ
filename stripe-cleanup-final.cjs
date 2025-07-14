/**
 * FINAL STRIPE CLEANUP - Remove duplicate Gail customer
 * Keep only the Macleodglba customer (User ID 2)
 */

const Stripe = require('stripe');

class FinalStripeCleanup {
  constructor() {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    this.targetEmail = 'gailm@macleodglba.com.au';
    this.customersDeleted = 0;
    this.subscriptionsCanceled = 0;
  }

  async run() {
    console.log('🎯 Final Stripe cleanup - removing duplicate customers');
    console.log(`📋 Target email: ${this.targetEmail}`);
    
    try {
      // Get all customers with target email
      const customers = await this.stripe.customers.list({
        email: this.targetEmail,
        limit: 100
      });
      
      console.log(`📊 Found ${customers.data.length} customers with email ${this.targetEmail}`);
      
      if (customers.data.length <= 1) {
        console.log('✅ Only 1 or fewer customers found - no cleanup needed');
        return;
      }
      
      // Keep the most recent customer (by creation date)
      const sortedCustomers = customers.data.sort((a, b) => b.created - a.created);
      const keepCustomer = sortedCustomers[0];
      const deleteCustomers = sortedCustomers.slice(1);
      
      console.log(`✅ Keeping customer: ${keepCustomer.id} (created: ${new Date(keepCustomer.created * 1000)})`);
      console.log(`🗑️ Deleting ${deleteCustomers.length} duplicate customers:`);
      
      for (const customer of deleteCustomers) {
        console.log(`   - ${customer.id} (created: ${new Date(customer.created * 1000)})`);
        await this.deleteCustomerCompletely(customer);
      }
      
      console.log('\n✅ FINAL CLEANUP COMPLETED');
      console.log(`📊 Customers deleted: ${this.customersDeleted}`);
      console.log(`📊 Subscriptions canceled: ${this.subscriptionsCanceled}`);
      
      // Validate final state
      await this.validateFinalState();
      
    } catch (error) {
      console.error('❌ Final cleanup failed:', error);
      throw error;
    }
  }

  async deleteCustomerCompletely(customer) {
    try {
      // Get and cancel all subscriptions first
      const subscriptions = await this.stripe.subscriptions.list({
        customer: customer.id,
        limit: 100
      });
      
      for (const subscription of subscriptions.data) {
        if (subscription.status !== 'canceled') {
          await this.stripe.subscriptions.cancel(subscription.id);
          console.log(`   ✅ Canceled subscription: ${subscription.id}`);
          this.subscriptionsCanceled++;
        }
      }
      
      // Delete the customer
      await this.stripe.customers.del(customer.id);
      console.log(`   ✅ Deleted customer: ${customer.id}`);
      this.customersDeleted++;
      
    } catch (error) {
      console.error(`   ❌ Error deleting customer ${customer.id}:`, error.message);
    }
  }

  async validateFinalState() {
    console.log('\n🔍 Final validation...');
    
    const customers = await this.stripe.customers.list({
      email: this.targetEmail,
      limit: 100
    });
    
    console.log(`📊 Customers remaining with target email: ${customers.data.length}`);
    
    if (customers.data.length === 1) {
      const customer = customers.data[0];
      console.log('✅ PERFECT: Exactly 1 customer remains');
      console.log(`   Customer ID: ${customer.id}`);
      console.log(`   Email: ${customer.email}`);
      console.log(`   Created: ${new Date(customer.created * 1000)}`);
    } else {
      console.log(`❌ ERROR: ${customers.data.length} customers still exist!`);
    }

    // Check for any other customers
    const allCustomers = await this.stripe.customers.list({ limit: 100 });
    const otherCustomers = allCustomers.data.filter(c => c.email !== this.targetEmail);
    
    if (otherCustomers.length > 0) {
      console.log(`⚠️ WARNING: ${otherCustomers.length} other customers exist:`);
      otherCustomers.forEach(customer => {
        console.log(`   - ${customer.id} (${customer.email})`);
      });
    } else {
      console.log('✅ No other customers found - clean state achieved');
    }
  }
}

// Execute final cleanup
if (require.main === module) {
  const cleanup = new FinalStripeCleanup();
  cleanup.run()
    .then(() => {
      console.log('✅ Final Stripe cleanup completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Final Stripe cleanup failed:', error);
      process.exit(1);
    });
}

module.exports = { FinalStripeCleanup };