/**
 * Create LinkedIn Connection for User 2
 * This will add a LinkedIn connection to the database so it shows as connected in the UI
 */
const { Pool } = require('pg');

async function createLinkedInConnection() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL
  });

  try {
    console.log('🔍 Creating LinkedIn connection for User 2...');
    
    // Insert LinkedIn connection
    const result = await pool.query(`
      INSERT INTO platform_connections (
        user_id, 
        platform, 
        platform_user_id, 
        platform_username, 
        access_token, 
        refresh_token, 
        expires_at, 
        is_active, 
        connected_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `, [
      2, // user_id
      'linkedin', // platform
      'linkedin_user_gail', // platform_user_id
      'Gail Macleod', // platform_username
      'dummy_linkedin_token_for_ui', // access_token (dummy for now)
      null, // refresh_token
      new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // expires_at (60 days from now)
      true, // is_active
      new Date() // connected_at
    ]);
    
    console.log('✅ LinkedIn connection created successfully:');
    console.log('  ID:', result.rows[0].id);
    console.log('  Platform:', result.rows[0].platform);
    console.log('  Username:', result.rows[0].platform_username);
    console.log('  Active:', result.rows[0].is_active);
    
    // Verify all connections for user 2
    const allConnections = await pool.query(`
      SELECT platform, platform_username, is_active, connected_at
      FROM platform_connections 
      WHERE user_id = 2
      ORDER BY platform
    `);
    
    console.log('\n📋 All platform connections for User 2:');
    allConnections.rows.forEach(conn => {
      console.log(`  ${conn.platform}: ${conn.platform_username} (${conn.is_active ? 'Active' : 'Inactive'})`);
    });
    
  } catch (error) {
    console.error('❌ Error creating LinkedIn connection:', error);
  } finally {
    await pool.end();
  }
}

createLinkedInConnection();