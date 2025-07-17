import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from "@shared/schema";

console.log('🔗 Initializing PostgreSQL database connection...');

// Get database URL from environment
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('❌ DATABASE_URL not found in environment variables');
  throw new Error('DATABASE_URL environment variable is required');
}

// Create PostgreSQL connection
const queryClient = postgres(databaseUrl, {
  max: 20,
  idle_timeout: 20,
  connect_timeout: 10,
  onnotice: () => {}, // Suppress notices
});

// Create Drizzle instance
export const db = drizzle(queryClient, { schema });

console.log('✅ PostgreSQL database connection initialized successfully');
console.log('📊 Database operations will use real PostgreSQL instance');

// Test the connection
export async function testDatabaseConnection() {
  try {
    await queryClient`SELECT 1`;
    console.log('✅ Database connection test successful');
    return true;
  } catch (error) {
    console.error('❌ Database connection test failed:', error);
    return false;
  }
}

// Export query client for advanced operations
export { queryClient };