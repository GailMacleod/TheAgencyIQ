const { Pool } = require('pg');
const fs = require('fs');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function migrateData() {
  try {
    // Read exported data from Replit
    const exportData = JSON.parse(fs.readFileSync('replit-export.json', 'utf8'));
    
    console.log('Starting data migration...');
    console.log(`Found ${exportData.users?.length || 0} users to migrate`);
    
    // Migrate users
    for (const user of exportData.users || []) {
      try {
        await pool.query(`
          INSERT INTO users (user_id, email, password, phone, subscription_plan, remaining_posts, total_posts, stripe_customer_id, stripe_subscription_id)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          ON CONFLICT (email) DO UPDATE SET
            user_id = EXCLUDED.user_id,
            phone = EXCLUDED.phone,
            subscription_plan = EXCLUDED.subscription_plan,
            remaining_posts = EXCLUDED.remaining_posts,
            total_posts = EXCLUDED.total_posts
        `, [
          user.userId || user.phone || user.email,
          user.email,
          user.password,
          user.phone,
          user.subscriptionPlan || 'starter',
          user.remainingPosts || 10,
          user.totalPosts || 0,
          user.stripeCustomerId || null,
          user.stripeSubscriptionId || null
        ]);
        console.log(`✓ Migrated user: ${user.email}`);
      } catch (userError) {
        console.error(`✗ Failed to migrate user ${user.email}:`, userError.message);
      }
    }
    
    // Migrate brand_purpose
    for (const brand of exportData.brand_purpose || []) {
      try {
        const userResult = await pool.query('SELECT id FROM users WHERE email = $1', [brand.userEmail]);
        if (userResult.rows.length > 0) {
          await pool.query(`
            INSERT INTO brand_purpose (user_id, brand_name, products_services, core_purpose, audience, job_to_be_done, motivations, pain_points, goals, contact_details, logo_url)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            ON CONFLICT DO NOTHING
          `, [
            userResult.rows[0].id,
            brand.brandName,
            brand.productsServices,
            brand.corePurpose,
            brand.audience,
            brand.jobToBeDone,
            brand.motivations,
            brand.painPoints,
            JSON.stringify(brand.goals || {}),
            JSON.stringify(brand.contactDetails || {}),
            brand.logoUrl
          ]);
          console.log(`✓ Migrated brand purpose for: ${brand.userEmail}`);
        }
      } catch (brandError) {
        console.error(`✗ Failed to migrate brand purpose:`, brandError.message);
      }
    }
    
    // Migrate posts
    for (const post of exportData.posts || []) {
      try {
        const userResult = await pool.query('SELECT id FROM users WHERE user_id = $1', [post.userId]);
        if (userResult.rows.length > 0) {
          await pool.query(`
            INSERT INTO posts (user_id, platform, content, scheduled_for, status, analytics)
            VALUES ($1, $2, $3, $4, $5, $6)
          `, [
            userResult.rows[0].id,
            post.platform,
            post.content,
            post.scheduledFor,
            post.status || 'draft',
            JSON.stringify(post.analytics || {})
          ]);
        }
      } catch (postError) {
        console.error(`✗ Failed to migrate post:`, postError.message);
      }
    }
    
    // Migrate post_ledger (quota tracking)
    for (const ledger of exportData.post_ledger || []) {
      try {
        await pool.query(`
          INSERT INTO post_ledger (user_id, post_id, platform, scheduled_for, status, analytics)
          VALUES ($1, $2, $3, $4, $5, $6)
        `, [
          ledger.user_id,
          ledger.post_id,
          ledger.platform,
          ledger.scheduled_for,
          ledger.status,
          JSON.stringify(ledger.analytics || {})
        ]);
      } catch (ledgerError) {
        console.error(`✗ Failed to migrate post ledger:`, ledgerError.message);
      }
    }
    
    // Migrate post_schedule
    for (const schedule of exportData.post_schedule || []) {
      try {
        await pool.query(`
          INSERT INTO post_schedule (user_id, platform, content, scheduled_for, status)
          VALUES ($1, $2, $3, $4, $5)
        `, [
          schedule.user_id,
          schedule.platform,
          schedule.content,
          schedule.scheduled_for,
          schedule.status
        ]);
      } catch (scheduleError) {
        console.error(`✗ Failed to migrate post schedule:`, scheduleError.message);
      }
    }
    
    console.log('\n✅ Data migration completed successfully');
    console.log('Users migrated:', exportData.users?.length || 0);
    console.log('Brand purposes migrated:', exportData.brand_purpose?.length || 0);
    console.log('Posts migrated:', exportData.posts?.length || 0);
    console.log('Post ledger entries migrated:', exportData.post_ledger?.length || 0);
    console.log('Post schedule entries migrated:', exportData.post_schedule?.length || 0);
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    await pool.end();
  }
}

migrateData();