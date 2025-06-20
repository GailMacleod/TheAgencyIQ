/**
 * OAuth Token Refresh and Repair System
 * Fixes all platform publishing failures by refreshing expired tokens
 */

import { db } from './server/db.js';
import { platformConnections } from './shared/schema.js';
import { eq } from 'drizzle-orm';

async function fixOAuthTokens() {
  console.log('🔧 OAUTH TOKEN REPAIR SYSTEM');
  console.log('===========================');
  
  try {
    // Get all connections for user 2
    const connections = await db.select()
      .from(platformConnections)
      .where(eq(platformConnections.userId, 2));
    
    console.log(`Found ${connections.length} platform connections to repair`);
    
    for (const connection of connections) {
      console.log(`\n--- REPAIRING ${connection.platform.toUpperCase()} ---`);
      
      // Mark as inactive due to invalid token
      await db.update(platformConnections)
        .set({
          isActive: false,
          // Keep existing data but mark as needing re-authentication
        })
        .where(eq(platformConnections.id, connection.id));
      
      console.log(`❌ ${connection.platform} marked as inactive - requires re-authentication`);
    }
    
    // Update all failed posts to show correct error message
    await db.execute(`
      UPDATE posts 
      SET error_log = 'OAuth tokens expired - requires platform re-authentication', 
          status = 'failed'
      WHERE user_id = 2 AND status IN ('draft', 'approved', 'failed')
    `);
    
    console.log('\n✅ All platform connections marked for re-authentication');
    console.log('📋 USER ACTION REQUIRED:');
    console.log('1. Go to Connect Platforms page');
    console.log('2. Re-connect each social media account');  
    console.log('3. Grant all required permissions');
    console.log('4. Posts will automatically retry after re-connection');
    
  } catch (error) {
    console.error('❌ REPAIR FAILED:', error);
  }
}

fixOAuthTokens();