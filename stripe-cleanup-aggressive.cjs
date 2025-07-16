/**
 * AGGRESSIVE STRIPE CLEANUP
 * Remove ALL customers except gailm@macleodglba.com.au and cancel all their subscriptions
 */

const Stripe = require('stripe');

class AggressiveStripeCleanup {
  constructor() {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    this.keepEmail = 'gailm@macleodglba.com.au';
    this.customersDeleted = 0;
    this.subscriptionsCanceled = 0;
    this.errors = [];
  }

  async run() {
    console.log('🔥 Starting AGGRESSIVE Stripe cleanup...');
    console.log(`📋 ONLY keeping: ${this.keepEmail}`);
    console.log('🚨 ALL other customers will be DELETED');
    
    try {
      // Get ALL customers
      const allCustomers = await this.getAllCustomers();
      console.log(`📊 Found ${allCustomers.length} total customers`);
      
      // Find the customer to keep
      const keepCustomer = allCustomers.find(customer => 
        customer.email === this.keepEmail
      );
      
      if (!keepCustomer) {
        throw new Error(`Customer with email ${this.keepEmail} not found!`);
      }
      
      console.log(`✅ Keeping customer: ${keepCustomer.id} (${keepCustomer.email})`);
      
      // Delete ALL other customers
      const customersToDelete = allCustomers.filter(customer => 
        customer.email !== this.keepEmail
      );
      
      console.log(`🗑️ Deleting ${customersToDelete.length} customers...`);
      
      for (const customer of customersToDelete) {
        await this.deleteCustomerCompletely(customer);
      }
      
      console.log('\n✅ AGGRESSIVE CLEANUP COMPLETED');
      console.log(`📊 Customers deleted: ${this.customersDeleted}`);
      console.log(`📊 Subscriptions canceled: ${this.subscriptionsCanceled}`);
      console.log(`📊 Errors: ${this.errors.length}`);
      
      // Final validation
      await this.validateFinalState();
      
    } catch (error) {
      console.error('❌ Aggressive cleanup failed:', error);
      throw error;
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
      console.log(`🗑️ Deleting customer: ${customer.id} (${customer.email})`);
      
      // First, get and cancel all subscriptions
      const subscriptions = await this.stripe.subscriptions.list({
        customer: customer.id,
        limit: 100
      });
      
      console.log(`   📋 Found ${subscriptions.data.length} subscriptions`);
      
      for (const subscription of subscriptions.data) {
        if (subscription.status !== 'canceled') {
          try {
            await this.stripe.subscriptions.cancel(subscription.id);
            console.log(`   ✅ Canceled subscription: ${subscription.id}`);
            this.subscriptionsCanceled++;
          } catch (error) {
            console.error(`   ❌ Failed to cancel subscription ${subscription.id}:`, error.message);
            this.errors.push({
              type: 'subscription_cancellation',
              customerId: customer.id,
              subscriptionId: subscription.id,
              error: error.message
            });
          }
        }
      }
      
      // Then delete the customer
      try {
        await this.stripe.customers.del(customer.id);
        console.log(`   ✅ Deleted customer: ${customer.id}`);
        this.customersDeleted++;
      } catch (error) {
        console.error(`   ❌ Failed to delete customer ${customer.id}:`, error.message);
        this.errors.push({
          type: 'customer_deletion',
          customerId: customer.id,
          error: error.message
        });
      }
      
    } catch (error) {
      console.error(`❌ Error processing customer ${customer.id}:`, error.message);
      this.errors.push({
        type: 'customer_processing',
        customerId: customer.id,
        error: error.message
      });
    }
  }

  async validateFinalState() {
    console.log('\n🔍 Validating final state...');
    
    try {
      const remainingCustomers = await this.getAllCustomers();
      console.log(`📊 Remaining customers: ${remainingCustomers.length}`);
      
      const targetCustomers = remainingCustomers.filter(customer => 
        customer.email === this.keepEmail
      );
      
      console.log(`📊 Target email customers: ${targetCustomers.length}`);
      
      if (targetCustomers.length === 1) {
        console.log('✅ PERFECT: Exactly 1 customer remains for target email');
        console.log(`   Customer ID: ${targetCustomers[0].id}`);
        console.log(`   Email: ${targetCustomers[0].email}`);
        console.log(`   Created: ${new Date(targetCustomers[0].created * 1000)}`);
      } else if (targetCustomers.length === 0) {
        console.log('❌ ERROR: No customers found for target email!');
      } else {
        console.log(`❌ ERROR: ${targetCustomers.length} customers still exist for target email!`);
      }
      
      // Show any other customers that shouldn't exist
      const otherCustomers = remainingCustomers.filter(customer => 
        customer.email !== this.keepEmail
      );
      
      if (otherCustomers.length > 0) {
        console.log(`⚠️ WARNING: ${otherCustomers.length} other customers still exist:`);
        otherCustomers.forEach(customer => {
          console.log(`   - ${customer.id} (${customer.email})`);
        });
      }
      
    } catch (error) {
      console.error('❌ Validation failed:', error);
      this.errors.push({
        type: 'validation',
        error: error.message
      });
    }
  }
}

// Execute aggressive cleanup
if (require.main === module) {
  const cleanup = new AggressiveStripeCleanup();
  cleanup.run()
    .then(() => {
      console.log('✅ Aggressive Stripe cleanup completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Aggressive Stripe cleanup failed:', error);
      process.exit(1);
    });
}

module.exports = { AggressiveStripeCleanup };