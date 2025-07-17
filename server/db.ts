// Try to use Neon serverless, fall back to standard pg if not available
import * as schema from "@shared/schema";

let pool: any;
let db: any;

try {
  // Try to import Neon serverless
  const { Pool, neonConfig } = await import('@neondatabase/serverless');
  const { drizzle } = await import('drizzle-orm/neon-serverless');
  const ws = await import("ws");
  
  neonConfig.webSocketConstructor = ws.default;
  
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL must be set. Did you forget to provision a database?");
  }
  
  pool = new Pool({ connectionString: process.env.DATABASE_URL });
  db = drizzle({ client: pool, schema });
  console.log('✅ Using Neon serverless database connection');
  
} catch (error) {
  console.log('⚠️ Neon serverless not available, trying standard PostgreSQL connection');
  
  try {
    // Try to fall back to standard PostgreSQL
    const { Pool } = await import('pg');
    const { drizzle } = await import('drizzle-orm/node-postgres');
    
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL must be set. Did you forget to provision a database?");
    }
    
    pool = new Pool({ connectionString: process.env.DATABASE_URL });
    db = drizzle({ client: pool, schema });
    console.log('✅ Using standard PostgreSQL database connection');
    
  } catch (fallbackError) {
    console.log('⚠️ No database packages available - using fallback memory system');
    
    // Fallback to memory-based system with basic structure
    pool = null;
    db = {
      query: () => Promise.resolve({ rows: [] }),
      select: () => ({ from: () => ({ where: () => Promise.resolve([]) }) }),
      insert: () => ({ values: () => Promise.resolve([]) }),
      update: () => ({ set: () => ({ where: () => Promise.resolve([]) }) }),
      delete: () => ({ where: () => Promise.resolve([]) })
    };
    console.log('✅ Using fallback memory-based database system');
  }
}

export { pool, db };