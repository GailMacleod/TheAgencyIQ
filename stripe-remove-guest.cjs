/**
 * REMOVE GUEST ACCOUNT FROM STRIPE
 * Delete the guest customer account that shouldn't exist
 */

const Stripe = require('stripe');

class GuestAccountRemoval {
  constructor() {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    this.targetEmail = 'gailm@macleodglba.com.au';
  }

  async run() {
    console.log('🗑️ Removing guest account from Stripe...');
    
    try {
      // Get all customers
      const allCustomers = await this.getAllCustomers();
      console.log(`📊 Found ${allCustomers.length} total customers`);
      
      // Find the target customer to keep
      const keepCustomer = allCustomers.find(customer => 
        customer.email === this.targetEmail
      );
      
      if (!keepCustomer) {
        throw new Error(`Target customer ${this.targetEmail} not found!`);
      }
      
      console.log(`✅ Keeping customer: ${keepCustomer.id} (${keepCustomer.email})`);
      
      // Find all other customers (including guest accounts)
      const deleteCustomers = allCustomers.filter(customer => 
        customer.email !== this.targetEmail
      );
      
      console.log(`🗑️ Found ${deleteCustomers.length} customers to delete:`);
      
      for (const customer of deleteCustomers) {
        console.log(`   - ${customer.id} (${customer.email || 'NO EMAIL'}) - ${customer.name || 'NO NAME'}`);
        
        // Check if this is a guest account
        const isGuest = !customer.email || 
                       customer.name === 'Guest' || 
                       customer.description?.includes('guest') ||
                       !customer.name;
        
        if (isGuest) {
          console.log(`     🎯 GUEST ACCOUNT DETECTED - Deleting immediately`);
        }
        
        await this.deleteCustomerCompletely(customer);
      }
      
      // Final validation
      await this.validateCleanState();
      
    } catch (error) {
      console.error('❌ Guest removal failed:', error);
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
      // Cancel all subscriptions first
      const subscriptions = await this.stripe.subscriptions.list({
        customer: customer.id,
        limit: 100
      });
      
      for (const subscription of subscriptions.data) {
        if (subscription.status !== 'canceled') {
          await this.stripe.subscriptions.cancel(subscription.id);
          console.log(`     ✅ Canceled subscription: ${subscription.id}`);
        }
      }
      
      // Delete the customer
      await this.stripe.customers.del(customer.id);
      console.log(`     ✅ Deleted customer: ${customer.id}`);
      
    } catch (error) {
      console.error(`     ❌ Error deleting customer ${customer.id}:`, error.message);
    }
  }

  async validateCleanState() {
    console.log('\n🔍 Validating clean state...');
    
    const remainingCustomers = await this.getAllCustomers();
    console.log(`📊 Remaining customers: ${remainingCustomers.length}`);
    
    if (remainingCustomers.length === 1) {
      const customer = remainingCustomers[0];
      if (customer.email === this.targetEmail) {
        console.log('✅ PERFECT: Only target customer remains');
        console.log(`   Customer ID: ${customer.id}`);
        console.log(`   Email: ${customer.email}`);
        console.log(`   Name: ${customer.name}`);
      } else {
        console.log('❌ ERROR: Wrong customer remaining!');
        console.log(`   Customer ID: ${customer.id}`);
        console.log(`   Email: ${customer.email}`);
        console.log(`   Name: ${customer.name}`);
      }
    } else {
      console.log(`❌ ERROR: ${remainingCustomers.length} customers still exist!`);
      remainingCustomers.forEach((customer, index) => {
        console.log(`   ${index + 1}. ${customer.id} (${customer.email}) - ${customer.name}`);
      });
    }
  }
}

// Execute guest removal
if (require.main === module) {
  const removal = new GuestAccountRemoval();
  removal.run()
    .then(() => {
      console.log('✅ Guest account removal completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Guest account removal failed:', error);
      process.exit(1);
    });
}

module.exports = { GuestAccountRemoval };