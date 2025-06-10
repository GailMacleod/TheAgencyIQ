const { Pool } = require('@neondatabase/serverless');
const ws = require('ws');

// Configure neon for Node.js environment
const neonConfig = require('@neondatabase/serverless').neonConfig;
neonConfig.webSocketConstructor = ws;

async function cleanupDuplicatePosts() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  
  try {
    console.log('Starting duplicate post cleanup...');
    
    // Get user with Professional plan (gailm@macleodglba.com.au)
    const userResult = await pool.query(
      'SELECT id, email, subscription_plan FROM users WHERE email = $1',
      ['gailm@macleodglba.com.au']
    );
    
    if (userResult.rows.length === 0) {
      console.log('User not found');
      return;
    }
    
    const user = userResult.rows[0];
    console.log(`Found user: ${user.email} with plan: ${user.subscription_plan}`);
    
    // Get all posts for this user
    const postsResult = await pool.query(
      'SELECT id, platform, status, created_at FROM posts WHERE user_id = $1 ORDER BY created_at ASC',
      [user.id]
    );
    
    console.log(`User has ${postsResult.rows.length} total posts`);
    
    // Professional plan gets 52 posts
    const PROFESSIONAL_LIMIT = 52;
    
    if (postsResult.rows.length <= PROFESSIONAL_LIMIT) {
      console.log(`User already has correct number of posts (${postsResult.rows.length}/${PROFESSIONAL_LIMIT})`);
      return;
    }
    
    // Keep the most recent 52 posts, delete the rest
    const postsToKeep = postsResult.rows.slice(-PROFESSIONAL_LIMIT);
    const postsToDelete = postsResult.rows.slice(0, -PROFESSIONAL_LIMIT);
    
    console.log(`Keeping ${postsToKeep.length} most recent posts`);
    console.log(`Deleting ${postsToDelete.length} older duplicate posts`);
    
    // Delete older posts
    for (const post of postsToDelete) {
      await pool.query('DELETE FROM posts WHERE id = $1', [post.id]);
    }
    
    console.log(`Cleanup complete. User now has ${PROFESSIONAL_LIMIT} posts as per Professional plan`);
    
  } catch (error) {
    console.error('Error during cleanup:', error);
  } finally {
    await pool.end();
  }
}

cleanupDuplicatePosts();