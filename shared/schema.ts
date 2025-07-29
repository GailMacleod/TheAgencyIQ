import { pgTable, text, serial, timestamp, integer, boolean, jsonb, varchar, index, numeric } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { eq } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Define users table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 255 }).unique().notNull(),
  password: text("password").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  // Add other fields per blueprint
});

export * from './authSchema';
export * from './postSchema';
export * from './userSchema';
export * from './analyticsSchema';
export * from './platformSchema';
export {
  // Auth
  sessions,
  enhancedOauthTokens,
  oauthTokens,
  // Post
  postSchedule,
  postLedger,
  posts,
  postLogs,
  enhancedPostLogs,
  // User
  brandPurpose,
  verificationCodes,
  giftCertificates,
  giftCertificateActionLog,
  // Analytics
  subscriptionAnalytics,
  videoUsage,
  quotaUsage,
  notificationLogs,
  // Platform
  platformConnections,
  // Insert schemas
  insertUserSchema,
  insertPostSchema,
  insertPlatformConnectionSchema,
  insertBrandPurposeSchema,
  insertVerificationCodeSchema,
  insertGiftCertificateSchema,
  insertGiftCertificateActionLogSchema,
  insertSubscriptionAnalyticsSchema,
  insertPostScheduleSchema,
  insertPostLedgerSchema,
  insertPostLogSchema
};
