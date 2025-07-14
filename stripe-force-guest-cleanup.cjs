/**
 * FORCE GUEST ACCOUNT CLEANUP
 * Comprehensive search and removal of any guest accounts
 */

const Stripe = require('stripe');

class ForceGuestCleanup {
  constructor() {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    this.targetEmail = 'gailm@macleodglba.com.au';
    this.customersDeleted = 0;
  }

  async run() {
    console.log('🔥 FORCE GUEST ACCOUNT CLEANUP - Comprehensive search...');
    
    try {
      // Multiple search strategies
      await this.searchByEmail();
      await this.searchByName();
      await this.searchByCreatedDate();
      await this.searchAllCustomers();
      
      console.log(`\n📊 Total customers deleted: ${this.customersDeleted}`);
      
    } catch (error) {
      console.error('❌ Force cleanup failed:', error);
      throw error;
    }
  }

  async searchByEmail() {
    console.log('\n🔍 Strategy 1: Search by email variations...');
    
    const emailVariations = [
      '', // Empty email for guest accounts
      null, // Null email
      'guest@example.com',
      'guest@stripe.com',
      'no-reply@stripe.com'
    ];
    
    for (const email of emailVariations) {
      try {
        const customers = await this.stripe.customers.list({
          email: email,
          limit: 100
        });
        
        if (customers.data.length > 0) {
          console.log(`   Found ${customers.data.length} customers with email: ${email || 'EMPTY'}`);
          
          for (const customer of customers.data) {
            if (customer.email !== this.targetEmail) {
              await this.deleteCustomerCompletely(customer);
            }
          }
        }
      } catch (error) {
        // Skip errors for invalid email searches
      }
    }
  }

  async searchByName() {
    console.log('\n🔍 Strategy 2: Search by name patterns...');
    
    const allCustomers = await this.getAllCustomers();
    
    const guestCustomers = allCustomers.filter(customer => 
      customer.email !== this.targetEmail && (
        !customer.name ||
        customer.name.toLowerCase().includes('guest') ||
        customer.name.toLowerCase().includes('anonymous') ||
        customer.name === 'Gail' ||
        customer.name === 'Guest'
      )
    );
    
    console.log(`   Found ${guestCustomers.length} potential guest customers by name`);
    
    for (const customer of guestCustomers) {
      console.log(`   - ${customer.id} (${customer.email || 'NO EMAIL'}) - Name: ${customer.name || 'NO NAME'}`);
      await this.deleteCustomerCompletely(customer);
    }
  }

  async searchByCreatedDate() {
    console.log('\n🔍 Strategy 3: Search by creation date...');
    
    // Look for customers created in last 30 days (likely test accounts)
    const thirtyDaysAgo = Math.floor(Date.now() / 1000) - (30 * 24 * 60 * 60);
    
    const customers = await this.stripe.customers.list({
      created: { gte: thirtyDaysAgo },
      limit: 100
    });
    
    const suspiciousCustomers = customers.data.filter(customer => 
      customer.email !== this.targetEmail
    );
    
    console.log(`   Found ${suspiciousCustomers.length} recent customers (excluding target)`);
    
    for (const customer of suspiciousCustomers) {
      console.log(`   - ${customer.id} (${customer.email || 'NO EMAIL'}) - Created: ${new Date(customer.created * 1000)}`);
      await this.deleteCustomerCompletely(customer);
    }
  }

  async searchAllCustomers() {
    console.log('\n🔍 Strategy 4: Comprehensive scan of all customers...');
    
    const allCustomers = await this.getAllCustomers();
    console.log(`   Total customers in system: ${allCustomers.length}`);
    
    console.log('\n   📋 ALL CUSTOMERS FOUND:');
    allCustomers.forEach((customer, index) => {
      console.log(`   ${index + 1}. ID: ${customer.id}`);
      console.log(`      Email: ${customer.email || 'NO EMAIL'}`);
      console.log(`      Name: ${customer.name || 'NO NAME'}`);
      console.log(`      Created: ${new Date(customer.created * 1000)}`);
      console.log(`      Default Source: ${customer.default_source || 'NONE'}`);
      console.log(`      Description: ${customer.description || 'NONE'}`);
      console.log('      ---');
    });
    
    // Delete any that aren't the target
    const deleteCustomers = allCustomers.filter(customer => 
      customer.email !== this.targetEmail
    );
    
    console.log(`\n   🗑️ Deleting ${deleteCustomers.length} non-target customers:`);
    
    for (const customer of deleteCustomers) {
      console.log(`   - Deleting: ${customer.id} (${customer.email || 'NO EMAIL'})`);
      await this.deleteCustomerCompletely(customer);
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
      console.log(`     ✅ DELETED: ${customer.id}`);
      this.customersDeleted++;
      
    } catch (error) {
      console.error(`     ❌ Error deleting customer ${customer.id}:`, error.message);
    }
  }
}

// Execute force cleanup
if (require.main === module) {
  const cleanup = new ForceGuestCleanup();
  cleanup.run()
    .then(() => {
      console.log('✅ Force guest cleanup completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Force guest cleanup failed:', error);
      process.exit(1);
    });
}

module.exports = { ForceGuestCleanup };