/**
 * STRIPE CUSTOMER ANALYSIS
 * Identify all customers and find duplicates for User ID 2
 */

const Stripe = require('stripe');

class StripeCustomerAnalysis {
  constructor() {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    this.targetEmail = 'gailm@macleodglba.com.au';
  }

  async run() {
    console.log('🔍 Analyzing all Stripe customers...');
    
    try {
      // Get ALL customers
      const allCustomers = await this.getAllCustomers();
      console.log(`📊 Total customers found: ${allCustomers.length}`);
      
      console.log('\n📋 ALL CUSTOMERS:');
      allCustomers.forEach((customer, index) => {
        console.log(`${index + 1}. ID: ${customer.id}`);
        console.log(`   Email: ${customer.email}`);
        console.log(`   Name: ${customer.name || 'N/A'}`);
        console.log(`   Created: ${new Date(customer.created * 1000)}`);
        console.log(`   Description: ${customer.description || 'N/A'}`);
        console.log('   ---');
      });
      
      // Look for potential User ID 2 customers
      const potentialDuplicates = allCustomers.filter(customer => 
        customer.email === this.targetEmail ||
        customer.email?.includes('gailm') ||
        customer.email?.includes('macleodglba') ||
        customer.name?.toLowerCase().includes('gail') ||
        customer.name?.toLowerCase().includes('macleod')
      );
      
      console.log('\n🎯 POTENTIAL USER ID 2 CUSTOMERS:');
      potentialDuplicates.forEach((customer, index) => {
        console.log(`${index + 1}. ID: ${customer.id}`);
        console.log(`   Email: ${customer.email}`);
        console.log(`   Name: ${customer.name || 'N/A'}`);
        console.log(`   Created: ${new Date(customer.created * 1000)}`);
        console.log('   ---');
      });
      
      if (potentialDuplicates.length > 1) {
        console.log(`\n⚠️ Found ${potentialDuplicates.length} potential duplicates!`);
        
        // Find the one to keep (most recent)
        const sortedByDate = potentialDuplicates.sort((a, b) => b.created - a.created);
        const keepCustomer = sortedByDate[0];
        const deleteCustomers = sortedByDate.slice(1);
        
        console.log(`✅ KEEP: ${keepCustomer.id} (${keepCustomer.email}) - Most recent`);
        console.log(`🗑️ DELETE: ${deleteCustomers.length} duplicates:`);
        deleteCustomers.forEach(customer => {
          console.log(`   - ${customer.id} (${customer.email})`);
        });
        
        // Ask for confirmation before deletion
        console.log('\n🚨 READY TO DELETE DUPLICATES');
        console.log('Run: node stripe-remove-duplicates.cjs');
        
      } else {
        console.log('\n✅ No duplicates found');
      }
      
    } catch (error) {
      console.error('❌ Analysis failed:', error);
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
}

// Execute analysis
if (require.main === module) {
  const analysis = new StripeCustomerAnalysis();
  analysis.run()
    .then(() => {
      console.log('✅ Customer analysis completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Customer analysis failed:', error);
      process.exit(1);
    });
}

module.exports = { StripeCustomerAnalysis };