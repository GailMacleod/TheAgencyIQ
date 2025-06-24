/**
 * Debug and Fix Subscription Quota System
 * Resolves post count discrepancies and enforces proper limits
 */

import { Pool } from '@neondatabase/serverless';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function debugAndFixQuotas() {
  console.log('🔧 Debugging subscription quota system...');
  
  try {
    // Get current quota status
    const quotaQuery = `
      SELECT 
        u.id, u.email, u.subscription_plan, u.remaining_posts, u.total_posts,
        COUNT(p.id) as actual_posts,
        COUNT(CASE WHEN p.status = 'published' THEN 1 END) as published_posts,
        COUNT(CASE WHEN p.status = 'approved' THEN 1 END) as approved_posts,
        COUNT(CASE WHEN p.status = 'draft' THEN 1 END) as draft_posts
      FROM users u
      LEFT JOIN posts p ON u.id = p.user_id
      GROUP BY u.id, u.email, u.subscription_plan, u.remaining_posts, u.total_posts
      ORDER BY u.id
    `;
    
    const result = await pool.query(quotaQuery);
    
    console.log('\n📊 CURRENT QUOTA STATUS:');
    console.log('========================');
    
    for (const user of result.rows) {
      const planLimits = {
        'starter': 12,
        'growth': 27,
        'professional': 52
      };
      
      const expectedLimit = planLimits[user.subscription_plan] || 12;
      const discrepancy = user.actual_posts - user.total_posts;
      
      console.log(`\nUser: ${user.email}`);
      console.log(`Plan: ${user.subscription_plan} (limit: ${expectedLimit})`);
      console.log(`Database total_posts: ${user.total_posts}`);
      console.log(`Actual posts in system: ${user.actual_posts}`);
      console.log(`Published: ${user.published_posts}, Approved: ${user.approved_posts}, Draft: ${user.draft_posts}`);
      console.log(`Remaining: ${user.remaining_posts}`);
      
      if (discrepancy !== 0) {
        console.log(`⚠️  DISCREPANCY: ${discrepancy} posts`);
        
        // Fix the discrepancy
        const newTotalPosts = user.actual_posts;
        const newRemainingPosts = Math.max(0, expectedLimit - user.published_posts);
        
        await pool.query(
          'UPDATE users SET total_posts = $1, remaining_posts = $2 WHERE id = $3',
          [newTotalPosts, newRemainingPosts, user.id]
        );
        
        console.log(`✅ FIXED: Updated total_posts to ${newTotalPosts}, remaining_posts to ${newRemainingPosts}`);
      } else {
        console.log('✅ Quota is consistent');
      }
    }
    
    // Enforce subscription limits
    console.log('\n🎯 ENFORCING SUBSCRIPTION LIMITS:');
    console.log('=================================');
    
    for (const user of result.rows) {
      const planLimits = {
        'starter': 12,
        'growth': 27,
        'professional': 52
      };
      
      const limit = planLimits[user.subscription_plan] || 12;
      
      if (user.published_posts > limit) {
        console.log(`⚠️  ${user.email} has ${user.published_posts} published posts, exceeding ${user.subscription_plan} limit of ${limit}`);
        
        // Mark excess posts as over-limit but don't delete them
        const excessPosts = user.published_posts - limit;
        await pool.query(
          `UPDATE posts 
           SET status = 'over_limit' 
           WHERE user_id = $1 AND status = 'published' 
           AND id IN (
             SELECT id FROM posts 
             WHERE user_id = $1 AND status = 'published' 
             ORDER BY published_at DESC 
             LIMIT $2
           )`,
          [user.id, excessPosts]
        );
        
        console.log(`✅ Marked ${excessPosts} excess posts as over_limit for ${user.email}`);
      }
    }
    
    // Final verification
    console.log('\n🏆 FINAL QUOTA STATUS:');
    console.log('=====================');
    
    const finalResult = await pool.query(quotaQuery);
    for (const user of finalResult.rows) {
      console.log(`${user.email}: ${user.subscription_plan} plan - ${user.published_posts} published, ${user.remaining_posts} remaining`);
    }
    
    return {
      success: true,
      message: 'Quota system debugged and fixed',
      usersProcessed: result.rows.length
    };
    
  } catch (error) {
    console.error('Quota debug failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Execute the fix
debugAndFixQuotas().then(result => {
  console.log('\n🎉 QUOTA SYSTEM OPTIMIZATION COMPLETE');
  console.log('====================================');
  console.log(result);
}).catch(console.error);