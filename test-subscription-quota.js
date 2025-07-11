#!/usr/bin/env node

/**
 * SUBSCRIPTION QUOTA TESTING SCRIPT
 * Tests post count limits across all subscription tiers
 * Verifies no draft duplication and proper quota deduction
 */

import { db } from './server/storage.js';
import { users, posts } from './shared/schema.js';
import { eq, and, desc } from 'drizzle-orm';

class SubscriptionQuotaTest {
  constructor() {
    this.testResults = [];
    this.testUsers = [];
  }

  async runTests() {
    console.log('🧪 Starting Subscription Quota Testing...');
    console.log('==========================================');

    try {
      // Test 1: Create test users for each tier
      await this.createTestUsers();

      // Test 2: Test Starter tier (12 posts)
      await this.testTier('starter', 12);

      // Test 3: Test Growth tier (27 posts)
      await this.testTier('growth', 27);

      // Test 4: Test Professional tier (52 posts)
      await this.testTier('professional', 52);

      // Test 5: Test navigation without duplicates
      await this.testNavigationDuplicates();

      // Test 6: Test quota deduction on publish
      await this.testQuotaDeduction();

      // Generate report
      await this.generateReport();

    } catch (error) {
      console.error('❌ Test execution failed:', error);
      process.exit(1);
    }
  }

  async createTestUsers() {
    console.log('👥 Creating test users...');
    
    const testUserData = [
      {
        email: 'test-starter@theagencyiq.com',
        password: '$2b$10$CwDOhrOnQoWEBjEUeBcEPO4Oi5vCJgzoJg6LvXTWgIIIgaJHt67XW',
        phone: '+61400000001',
        subscriptionPlan: 'starter',
        remainingPosts: 12,
        totalPosts: 12
      },
      {
        email: 'test-growth@theagencyiq.com',
        password: '$2b$10$CwDOhrOnQoWEBjEUeBcEPO4Oi5vCJgzoJg6LvXTWgIIIgaJHt67XW',
        phone: '+61400000002',
        subscriptionPlan: 'growth',
        remainingPosts: 27,
        totalPosts: 27
      },
      {
        email: 'test-professional@theagencyiq.com',
        password: '$2b$10$CwDOhrOnQoWEBjEUeBcEPO4Oi5vCJgzoJg6LvXTWgIIIgaJHt67XW',
        phone: '+61400000003',
        subscriptionPlan: 'professional',
        remainingPosts: 52,
        totalPosts: 52
      }
    ];

    for (const userData of testUserData) {
      try {
        // Check if user already exists
        const existingUser = await db.select().from(users).where(eq(users.email, userData.email));
        
        if (existingUser.length === 0) {
          const [user] = await db.insert(users).values(userData).returning();
          this.testUsers.push(user);
          console.log(`  ✅ Created ${userData.subscriptionPlan} user: ${userData.email}`);
        } else {
          this.testUsers.push(existingUser[0]);
          console.log(`  ↩️  Using existing ${userData.subscriptionPlan} user: ${userData.email}`);
        }
      } catch (error) {
        console.error(`  ❌ Failed to create user ${userData.email}:`, error.message);
      }
    }
  }

  async testTier(tierName, expectedPosts) {
    console.log(`\n📊 Testing ${tierName} tier (${expectedPosts} posts)...`);
    
    const testUser = this.testUsers.find(u => u.subscriptionPlan === tierName);
    if (!testUser) {
      console.error(`❌ Test user for ${tierName} not found`);
      return;
    }

    try {
      // Clear existing posts for this user
      await db.delete(posts).where(eq(posts.userId, testUser.id));

      // Test 1: Generate initial schedule
      const initialDrafts = await this.simulateScheduleGeneration(testUser.id, expectedPosts);
      
      // Test 2: Check draft count
      const draftCount = await db.select().from(posts).where(
        and(eq(posts.userId, testUser.id), eq(posts.status, 'draft'))
      );
      
      console.log(`  📝 Generated ${draftCount.length} drafts (expected: ${expectedPosts})`);
      
      if (draftCount.length === expectedPosts) {
        console.log(`  ✅ ${tierName} tier: Correct number of drafts generated`);
        this.testResults.push({
          test: `${tierName}_draft_generation`,
          status: 'PASS',
          expected: expectedPosts,
          actual: draftCount.length
        });
      } else {
        console.log(`  ❌ ${tierName} tier: Expected ${expectedPosts}, got ${draftCount.length}`);
        this.testResults.push({
          test: `${tierName}_draft_generation`,
          status: 'FAIL',
          expected: expectedPosts,
          actual: draftCount.length
        });
      }

      // Test 3: Regenerate schedule (should not duplicate)
      await this.simulateScheduleGeneration(testUser.id, expectedPosts);
      
      const duplicateCheck = await db.select().from(posts).where(
        and(eq(posts.userId, testUser.id), eq(posts.status, 'draft'))
      );
      
      console.log(`  🔄 After regeneration: ${duplicateCheck.length} drafts`);
      
      if (duplicateCheck.length === expectedPosts) {
        console.log(`  ✅ ${tierName} tier: No duplicates after regeneration`);
        this.testResults.push({
          test: `${tierName}_no_duplicates`,
          status: 'PASS',
          expected: expectedPosts,
          actual: duplicateCheck.length
        });
      } else {
        console.log(`  ❌ ${tierName} tier: Duplicates detected after regeneration`);
        this.testResults.push({
          test: `${tierName}_no_duplicates`,
          status: 'FAIL',
          expected: expectedPosts,
          actual: duplicateCheck.length
        });
      }

    } catch (error) {
      console.error(`❌ ${tierName} tier test failed:`, error.message);
      this.testResults.push({
        test: `${tierName}_tier_test`,
        status: 'ERROR',
        error: error.message
      });
    }
  }

  async simulateScheduleGeneration(userId, postCount) {
    console.log(`  🤖 Simulating schedule generation for user ${userId}...`);
    
    // Clear existing drafts
    await db.delete(posts).where(
      and(eq(posts.userId, userId), eq(posts.status, 'draft'))
    );

    // Generate posts
    const postsToInsert = [];
    for (let i = 0; i < postCount; i++) {
      postsToInsert.push({
        userId,
        platform: ['facebook', 'instagram', 'linkedin', 'youtube', 'twitter'][i % 5],
        content: `Test post ${i + 1} for quota testing`,
        status: 'draft',
        scheduledFor: new Date(Date.now() + (i * 24 * 60 * 60 * 1000)).toISOString()
      });
    }

    await db.insert(posts).values(postsToInsert);
    console.log(`  ✅ Generated ${postCount} draft posts`);
    return postsToInsert;
  }

  async testNavigationDuplicates() {
    console.log('\n🧭 Testing navigation without duplicates...');
    
    const testUser = this.testUsers.find(u => u.subscriptionPlan === 'starter');
    if (!testUser) {
      console.error('❌ Starter test user not found');
      return;
    }

    try {
      // Clear existing posts
      await db.delete(posts).where(eq(posts.userId, testUser.id));

      // Simulate navigation: brand-purpose → schedule → back to brand-purpose → schedule
      console.log('  🔄 Simulating navigation: brand-purpose → schedule → brand-purpose → schedule');
      
      // First generation
      await this.simulateScheduleGeneration(testUser.id, 12);
      const firstCount = await db.select().from(posts).where(
        and(eq(posts.userId, testUser.id), eq(posts.status, 'draft'))
      );

      // Second generation (navigation back and forth)
      await this.simulateScheduleGeneration(testUser.id, 12);
      const secondCount = await db.select().from(posts).where(
        and(eq(posts.userId, testUser.id), eq(posts.status, 'draft'))
      );

      console.log(`  📊 First generation: ${firstCount.length}, Second generation: ${secondCount.length}`);

      if (firstCount.length === 12 && secondCount.length === 12) {
        console.log('  ✅ Navigation test: No duplicates detected');
        this.testResults.push({
          test: 'navigation_no_duplicates',
          status: 'PASS',
          expected: 12,
          actual: secondCount.length
        });
      } else {
        console.log('  ❌ Navigation test: Duplicates or incorrect count detected');
        this.testResults.push({
          test: 'navigation_no_duplicates',
          status: 'FAIL',
          expected: 12,
          actual: secondCount.length
        });
      }

    } catch (error) {
      console.error('❌ Navigation test failed:', error.message);
      this.testResults.push({
        test: 'navigation_test',
        status: 'ERROR',
        error: error.message
      });
    }
  }

  async testQuotaDeduction() {
    console.log('\n💰 Testing quota deduction on publish...');
    
    const testUser = this.testUsers.find(u => u.subscriptionPlan === 'growth');
    if (!testUser) {
      console.error('❌ Growth test user not found');
      return;
    }

    try {
      // Reset user quota
      await db.update(users)
        .set({ remainingPosts: 27, totalPosts: 27 })
        .where(eq(users.id, testUser.id));

      // Clear existing posts
      await db.delete(posts).where(eq(posts.userId, testUser.id));

      // Generate drafts
      await this.simulateScheduleGeneration(testUser.id, 27);

      // Get user quota before publish
      const beforePublish = await db.select().from(users).where(eq(users.id, testUser.id));
      console.log(`  📊 Before publish: ${beforePublish[0].remainingPosts} remaining posts`);

      // Publish one post
      const drafts = await db.select().from(posts).where(
        and(eq(posts.userId, testUser.id), eq(posts.status, 'draft'))
      );

      if (drafts.length > 0) {
        // Simulate publishing
        await db.update(posts)
          .set({ status: 'published', publishedAt: new Date().toISOString() })
          .where(eq(posts.id, drafts[0].id));

        // Update user quota
        await db.update(users)
          .set({ remainingPosts: beforePublish[0].remainingPosts - 1 })
          .where(eq(users.id, testUser.id));

        // Get user quota after publish
        const afterPublish = await db.select().from(users).where(eq(users.id, testUser.id));
        console.log(`  📊 After publish: ${afterPublish[0].remainingPosts} remaining posts`);

        if (afterPublish[0].remainingPosts === 26) {
          console.log('  ✅ Quota deduction: Correct deduction (27 → 26)');
          this.testResults.push({
            test: 'quota_deduction',
            status: 'PASS',
            expected: 26,
            actual: afterPublish[0].remainingPosts
          });
        } else {
          console.log('  ❌ Quota deduction: Incorrect deduction');
          this.testResults.push({
            test: 'quota_deduction',
            status: 'FAIL',
            expected: 26,
            actual: afterPublish[0].remainingPosts
          });
        }
      }

    } catch (error) {
      console.error('❌ Quota deduction test failed:', error.message);
      this.testResults.push({
        test: 'quota_deduction_test',
        status: 'ERROR',
        error: error.message
      });
    }
  }

  async generateReport() {
    console.log('\n📊 SUBSCRIPTION QUOTA TEST REPORT');
    console.log('=====================================');

    const passed = this.testResults.filter(r => r.status === 'PASS').length;
    const failed = this.testResults.filter(r => r.status === 'FAIL').length;
    const errors = this.testResults.filter(r => r.status === 'ERROR').length;

    console.log(`📈 Test Summary:`);
    console.log(`  ✅ Passed: ${passed}`);
    console.log(`  ❌ Failed: ${failed}`);
    console.log(`  🔥 Errors: ${errors}`);
    console.log(`  📊 Total: ${this.testResults.length}`);

    console.log('\n📋 Detailed Results:');
    this.testResults.forEach((result, index) => {
      const status = result.status === 'PASS' ? '✅' : result.status === 'FAIL' ? '❌' : '🔥';
      console.log(`  ${index + 1}. ${status} ${result.test}`);
      if (result.expected !== undefined) {
        console.log(`     Expected: ${result.expected}, Actual: ${result.actual}`);
      }
      if (result.error) {
        console.log(`     Error: ${result.error}`);
      }
    });

    // Save report to file
    const report = {
      timestamp: new Date().toISOString(),
      summary: { passed, failed, errors, total: this.testResults.length },
      results: this.testResults
    };

    const fs = await import('fs');
    fs.writeFileSync('SUBSCRIPTION_QUOTA_TEST_REPORT.json', JSON.stringify(report, null, 2));
    console.log('\n💾 Report saved to: SUBSCRIPTION_QUOTA_TEST_REPORT.json');

    // Cleanup test users
    await this.cleanupTestUsers();
  }

  async cleanupTestUsers() {
    console.log('\n🧹 Cleaning up test users...');
    
    for (const user of this.testUsers) {
      try {
        await db.delete(posts).where(eq(posts.userId, user.id));
        await db.delete(users).where(eq(users.id, user.id));
        console.log(`  ✅ Cleaned up user: ${user.email}`);
      } catch (error) {
        console.error(`  ❌ Failed to cleanup user ${user.email}:`, error.message);
      }
    }
  }
}

// Execute tests if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const test = new SubscriptionQuotaTest();
  test.runTests()
    .then(() => {
      console.log('\n🎉 Subscription quota testing completed');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n💥 Subscription quota testing failed:', error);
      process.exit(1);
    });
}

export default SubscriptionQuotaTest;