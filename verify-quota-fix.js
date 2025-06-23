/**
 * Verification Script for Post Quota Fix
 * Confirms the quota enforcement resolved the post count and ledger issues
 */

import { Pool } from '@neondatabase/serverless';

async function verifyQuotaFix() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  
  try {
    console.log('=== POST QUOTA FIX VERIFICATION ===\n');
    
    // Check professional user (ID 2) post counts
    const postCounts = await pool.query(`
      SELECT COUNT(*) as total_posts, status, COUNT(*) as count
      FROM posts 
      WHERE user_id = 2 
      GROUP BY status 
      ORDER BY status
    `);
    
    console.log('📊 Current Post Counts by Status:');
    postCounts.rows.forEach(row => {
      console.log(`   ${row.status}: ${row.count} posts`);
    });
    
    const totalPosts = postCounts.rows.reduce((sum, row) => sum + parseInt(row.count), 0);
    console.log(`\n📈 Total Posts: ${totalPosts} (Expected: 52 for Professional plan)`);
    
    // Verify successful posts in last 30 days
    const successfulPosts = await pool.query(`
      SELECT COUNT(*) as successful_posts_30_days
      FROM posts 
      WHERE user_id = 2 
      AND status = 'success' 
      AND published_at > NOW() - INTERVAL '30 days'
    `);
    
    console.log(`📅 Successful Posts (30 days): ${successfulPosts.rows[0].successful_posts_30_days}`);
    
    // Check user subscription details
    const userDetails = await pool.query(`
      SELECT id, email, phone, subscription_plan, remaining_posts, total_posts
      FROM users 
      WHERE id = 2
    `);
    
    if (userDetails.rows.length > 0) {
      const user = userDetails.rows[0];
      console.log('\n👤 User Details:');
      console.log(`   Email: ${user.email}`);
      console.log(`   Phone: ${user.phone}`);
      console.log(`   Plan: ${user.subscription_plan}`);
      console.log(`   Remaining Posts: ${user.remaining_posts}`);
      console.log(`   Total Posts: ${user.total_posts}`);
    }
    
    // Quota validation
    const quotaLimits = { starter: 12, growth: 27, professional: 52 };
    const expectedQuota = quotaLimits.professional;
    const quotaCompliant = totalPosts <= expectedQuota;
    
    console.log('\n✅ QUOTA COMPLIANCE CHECK:');
    console.log(`   Expected Limit: ${expectedQuota} posts`);
    console.log(`   Current Count: ${totalPosts} posts`);
    console.log(`   Status: ${quotaCompliant ? '✅ COMPLIANT' : '❌ EXCEEDS QUOTA'}`);
    
    // Status validation 
    const invalidStatuses = postCounts.rows.filter(row => 
      !['draft', 'pending', 'approved', 'published', 'success', 'failed'].includes(row.status)
    );
    
    console.log('\n📋 STATUS VALIDATION:');
    console.log(`   Valid Statuses: ${invalidStatuses.length === 0 ? '✅ ALL VALID' : '❌ INVALID FOUND'}`);
    
    if (invalidStatuses.length > 0) {
      console.log('   Invalid statuses found:');
      invalidStatuses.forEach(row => console.log(`     - ${row.status}: ${row.count} posts`));
    }
    
    // Final assessment
    console.log('\n🎯 QUOTA FIX ASSESSMENT:');
    if (quotaCompliant && totalPosts === expectedQuota && invalidStatuses.length === 0) {
      console.log('   ✅ QUOTA FIX SUCCESSFUL');
      console.log('   ✅ Post count stabilized at professional limit');
      console.log('   ✅ Ledger ready for reliable auto-posting');
    } else {
      console.log('   ⚠️  Additional adjustments needed');
    }
    
  } catch (error) {
    console.error('❌ Verification failed:', error.message);
  } finally {
    await pool.end();
  }
}

// Run verification
verifyQuotaFix();