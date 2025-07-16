// Simple in-memory database for development
import * as schema from "@shared/schema";

// Mock database for now - in production would use actual database
const mockDb = {
  query: (sql: string, params?: any[]) => {
    console.log('Mock DB Query:', sql, params);
    return Promise.resolve([]);
  },
  insert: (table: string, data: any) => {
    console.log('Mock DB Insert:', table, data);
    return Promise.resolve({ insertId: Date.now() });
  }
};

export const db = mockDb as any;