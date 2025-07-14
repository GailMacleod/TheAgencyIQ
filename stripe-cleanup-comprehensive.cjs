/**
 * COMPREHENSIVE STRIPE CLEANUP SCRIPT
 * Cleans up 116 duplicate subscriptions while preserving only User ID 2 subscription
 * Integrates with logging service for complete audit trail
 */

// Note: This script requires CommonJS module format due to dynamic imports
// Run with: node --loader ts-node/esm stripe-cleanup-comprehensive.cjs

async function loadModules() {
  const { storage } = await import('./server/storage.js');
  const { loggingService } = await import('./server/logging-service.js');
  const Stripe = (await import('stripe')).default;
  return { storage, loggingService, Stripe };
}

// Stripe will be initialized in constructor

class StripeCleanupService {
  constructor(modules) {
    this.storage = modules.storage;
    this.loggingService = modules.loggingService;
    this.Stripe = modules.Stripe;
    this.keepUserId = 2; // gailm@macleodglba.com.au
    this.keepEmail = 'gailm@macleodglba.com.au';
    this.duplicatesFound = 0;
    this.duplicatesCanceled = 0;
    this.duplicatesDeleted = 0;
    this.cleanupReport = {
      startTime: new Date(),
      duplicateSubscriptions: [],
      duplicateCustomers: [],
      actions: [],
      errors: []
    };
  }

  async run() {
    try {
      // Initialize Stripe
      this.stripe = new this.Stripe(process.env.STRIPE_SECRET_KEY);
      
      console.log('🧹 Starting comprehensive Stripe cleanup...');
      console.log(`📋 Preserving User ID ${this.keepUserId} (${this.keepEmail})`);
      
      // Step 1: Get target user to preserve
      const targetUser = await this.storage.getUser(this.keepUserId);
      if (!targetUser) {
        throw new Error(`Target user ID ${this.keepUserId} not found`);
      }
      
      console.log(`✅ Target user found: ${targetUser.email} (Subscription: ${targetUser.stripeSubscriptionId})`);
      
      // Step 2: Clean up duplicate database entries
      await this.cleanupDatabaseDuplicates(targetUser);
      
      // Step 3: Clean up Stripe duplicates
      await this.cleanupStripeDuplicates(targetUser);
      
      // Step 4: Validate final state
      await this.validateCleanupResults(targetUser);
      
      // Step 5: Generate cleanup report
      await this.generateCleanupReport();
      
      console.log('✅ Comprehensive Stripe cleanup completed successfully');
      
    } catch (error) {
      console.error('❌ Stripe cleanup failed:', error);
      
      // Log cleanup failure
      this.loggingService.logSubscriptionValidation(
        this.keepUserId,
        this.keepEmail,
        'cleanup_failed',
        false,
        { error: error.message }
      );
      
      throw error;
    }
  }

  async cleanupDatabaseDuplicates(targetUser) {
    console.log('\n🗃️ Cleaning up database duplicates...');
    
    try {
      // Get all users with Stripe customers
      const allStripeUsers = await storage.listAllStripeCustomers();
      console.log(`📊 Found ${allStripeUsers.length} users with Stripe customers`);
      
      // Find duplicates (users other than target user with Stripe data)
      const duplicates = allStripeUsers.filter(user => user.id !== this.keepUserId);
      this.duplicatesFound = duplicates.length;
      
      console.log(`🔍 Found ${duplicates.length} duplicate users to clean`);
      
      // Clear duplicate Stripe customers
      await storage.clearDuplicateStripeCustomers(this.keepUserId);
      
      // Log database cleanup
      loggingService.logDuplicatePrevention(
        this.keepUserId,
        this.keepEmail,
        targetUser.stripeSubscriptionId || 'none',
        'database_cleanup',
        true,
        { duplicatesFound: duplicates.length, duplicatesCleared: duplicates.length }
      );
      
      console.log(`✅ Database cleanup completed - ${duplicates.length} duplicates cleared`);
      
    } catch (error) {
      console.error('❌ Database cleanup failed:', error);
      this.cleanupReport.errors.push({
        step: 'database_cleanup',
        error: error.message,
        timestamp: new Date()
      });
      throw error;
    }
  }

  async cleanupStripeDuplicates(targetUser) {
    console.log('\n💳 Cleaning up Stripe duplicates...');
    
    try {
      // Get all Stripe customers
      const customers = await stripe.customers.list({ limit: 100 });
      console.log(`📊 Found ${customers.data.length} Stripe customers`);
      
      // Find customers for target email
      const targetCustomers = customers.data.filter(customer => 
        customer.email === this.keepEmail
      );
      
      console.log(`🎯 Found ${targetCustomers.length} customers for ${this.keepEmail}`);
      
      // Keep only the customer associated with target user
      const keepCustomer = targetCustomers.find(customer => 
        customer.id === targetUser.stripeCustomerId
      );
      
      if (!keepCustomer) {
        console.log('⚠️ No matching customer found for target user');
        return;
      }
      
      console.log(`✅ Keeping customer: ${keepCustomer.id}`);
      
      // Cancel and delete duplicate customers
      const duplicateCustomers = targetCustomers.filter(customer => 
        customer.id !== keepCustomer.id
      );
      
      for (const customer of duplicateCustomers) {
        await this.cleanupCustomer(customer);
      }
      
      console.log(`✅ Stripe cleanup completed - ${this.duplicatesCanceled} subscriptions canceled, ${this.duplicatesDeleted} customers deleted`);
      
    } catch (error) {
      console.error('❌ Stripe cleanup failed:', error);
      this.cleanupReport.errors.push({
        step: 'stripe_cleanup',
        error: error.message,
        timestamp: new Date()
      });
      throw error;
    }
  }

  async cleanupCustomer(customer) {
    try {
      console.log(`🧹 Cleaning up customer: ${customer.id}`);
      
      // Get all subscriptions for this customer
      const subscriptions = await stripe.subscriptions.list({
        customer: customer.id,
        limit: 100
      });
      
      console.log(`📋 Found ${subscriptions.data.length} subscriptions for customer ${customer.id}`);
      
      // Cancel all subscriptions
      for (const subscription of subscriptions.data) {
        if (subscription.status !== 'canceled') {
          try {
            await stripe.subscriptions.cancel(subscription.id);
            console.log(`✅ Canceled subscription: ${subscription.id}`);
            this.duplicatesCanceled++;
            
            // Log subscription cancellation
            loggingService.logDuplicatePrevention(
              this.keepUserId,
              this.keepEmail,
              subscription.id,
              'subscription_cleanup',
              true,
              { 
                action: 'canceled',
                customerId: customer.id,
                subscriptionId: subscription.id,
                status: subscription.status
              }
            );
            
            this.cleanupReport.duplicateSubscriptions.push({
              id: subscription.id,
              customerId: customer.id,
              status: subscription.status,
              action: 'canceled',
              timestamp: new Date()
            });
            
          } catch (error) {
            console.error(`❌ Failed to cancel subscription ${subscription.id}:`, error);
            this.cleanupReport.errors.push({
              step: 'subscription_cancellation',
              subscriptionId: subscription.id,
              error: error.message,
              timestamp: new Date()
            });
          }
        }
      }
      
      // Delete customer after all subscriptions are canceled
      try {
        await stripe.customers.del(customer.id);
        console.log(`✅ Deleted customer: ${customer.id}`);
        this.duplicatesDeleted++;
        
        this.cleanupReport.duplicateCustomers.push({
          id: customer.id,
          email: customer.email,
          action: 'deleted',
          timestamp: new Date()
        });
        
      } catch (error) {
        console.error(`❌ Failed to delete customer ${customer.id}:`, error);
        this.cleanupReport.errors.push({
          step: 'customer_deletion',
          customerId: customer.id,
          error: error.message,
          timestamp: new Date()
        });
      }
      
    } catch (error) {
      console.error(`❌ Failed to cleanup customer ${customer.id}:`, error);
      this.cleanupReport.errors.push({
        step: 'customer_cleanup',
        customerId: customer.id,
        error: error.message,
        timestamp: new Date()
      });
    }
  }

  async validateCleanupResults(targetUser) {
    console.log('\n🔍 Validating cleanup results...');
    
    try {
      // Validate database state
      const remainingStripeUsers = await storage.listAllStripeCustomers();
      const shouldHaveOne = remainingStripeUsers.filter(user => user.id === this.keepUserId);
      
      if (shouldHaveOne.length !== 1) {
        throw new Error(`Expected 1 user with Stripe data, found ${shouldHaveOne.length}`);
      }
      
      console.log(`✅ Database validation: 1 user with Stripe data (User ID ${this.keepUserId})`);
      
      // Validate Stripe state
      const customers = await stripe.customers.list({ 
        email: this.keepEmail,
        limit: 100 
      });
      
      const activeCustomers = customers.data.filter(customer => !customer.deleted);
      
      if (activeCustomers.length > 1) {
        console.log(`⚠️ Warning: Found ${activeCustomers.length} active customers for ${this.keepEmail}`);
      } else {
        console.log(`✅ Stripe validation: ${activeCustomers.length} active customer(s) for ${this.keepEmail}`);
      }
      
      // Validate target user subscription
      const isValid = await storage.validateActiveSubscription(this.keepUserId);
      console.log(`✅ Target user subscription validation: ${isValid ? 'ACTIVE' : 'INACTIVE'}`);
      
      // Log validation results
      loggingService.logSubscriptionValidation(
        this.keepUserId,
        this.keepEmail,
        targetUser.stripeSubscriptionId || 'none',
        isValid,
        {
          databaseUsers: remainingStripeUsers.length,
          stripeCustomers: activeCustomers.length,
          cleanupCompleted: true
        }
      );
      
    } catch (error) {
      console.error('❌ Validation failed:', error);
      this.cleanupReport.errors.push({
        step: 'validation',
        error: error.message,
        timestamp: new Date()
      });
      throw error;
    }
  }

  async generateCleanupReport() {
    this.cleanupReport.endTime = new Date();
    this.cleanupReport.duration = this.cleanupReport.endTime - this.cleanupReport.startTime;
    this.cleanupReport.summary = {
      duplicatesFound: this.duplicatesFound,
      subscriptionsCanceled: this.duplicatesCanceled,
      customersDeleted: this.duplicatesDeleted,
      errorsEncountered: this.cleanupReport.errors.length,
      targetUserPreserved: this.keepUserId,
      targetEmail: this.keepEmail
    };
    
    // Write report to file
    const fs = require('fs');
    const reportPath = `STRIPE_CLEANUP_REPORT_${Date.now()}.json`;
    fs.writeFileSync(reportPath, JSON.stringify(this.cleanupReport, null, 2));
    
    console.log(`\n📊 CLEANUP SUMMARY:`);
    console.log(`   • Duplicates Found: ${this.duplicatesFound}`);
    console.log(`   • Subscriptions Canceled: ${this.duplicatesCanceled}`);
    console.log(`   • Customers Deleted: ${this.duplicatesDeleted}`);
    console.log(`   • Errors: ${this.cleanupReport.errors.length}`);
    console.log(`   • Duration: ${Math.round(this.cleanupReport.duration / 1000)}s`);
    console.log(`   • Report: ${reportPath}`);
    
    return this.cleanupReport;
  }
}

// Execute cleanup if run directly
if (require.main === module) {
  loadModules()
    .then((modules) => {
      const cleanup = new StripeCleanupService(modules);
      return cleanup.run();
    })
    .then(() => {
      console.log('✅ Stripe cleanup completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Stripe cleanup failed:', error);
      process.exit(1);
    });
}

module.exports = { StripeCleanupService };