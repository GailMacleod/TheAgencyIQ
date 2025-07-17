// Simplified database configuration - create a mock database interface for development
import * as schema from "@shared/schema";

console.log('🔗 Initializing mock database for development...');

// Create a mock database object to satisfy imports
export const db = {
  select: () => ({ from: () => ({ where: () => [] }) }),
  insert: () => ({ values: () => ({ returning: () => [] }) }),
  update: () => ({ set: () => ({ where: () => ({ returning: () => [] }) }) }),
  delete: () => ({ where: () => [] }),
  execute: () => Promise.resolve([]),
  transaction: (callback: any) => callback(db)
};

console.log('✅ Mock database interface initialized successfully');
console.log('📋 Database operations will be mocked for initial setup');