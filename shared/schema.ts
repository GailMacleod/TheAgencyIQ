import { pgTable, text, serial, timestamp, integer, boolean, jsonb, varchar, index, numeric } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { eq } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Define missing tables
export const postLogs = pgTable("post_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  postId: integer("post_id").references(() => posts.id),
  platform: varchar("platform", { length: 50 }),
  status: varchar("status", { length: 50 }),
  error: text("error"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const subscriptionAnalytics = pgTable("subscription_analytics", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  subscriptionType: varchar("subscription_type", { length: 50 }),
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  status: varchar("status", { length: 50 }),
  createdAt: timestamp("created_at").defaultNow(),
});

export const videoUsage = pgTable("video_usage", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  videoId: varchar("video_id", { length: 255 }),
  duration: integer("duration"),
  costUsd: numeric("cost_usd", { precision: 10, scale: 2 }),
  approvedAt: timestamp("approved_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const postSchedule = pgTable("post_schedule", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  platform: varchar("platform", { length: 50 }),
  content: text("content"),
  scheduledAt: timestamp("scheduled_at"),
  approved: boolean("approved").default(false),
  videoApproved: boolean("video_approved").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Insert schemas
export const insertPostScheduleSchema = createInsertSchema(postSchedule);

// Export from sub-files
export * from './authSchema';
export * from './postSchema';
export * from './userSchema';
export * from './analyticsSchema';
export * from './platformSchema';

// Explicit exports
export {
  // Add your existing ones here, plus missing
  postLogs,
  subscriptionAnalytics,
  videoUsage,
  insertPostScheduleSchema,
  // Auth
  sessions,
  enhancedOauthTokens,
  oauthTokens,
  // Post
  postSchedule,
  postLedger,
  posts,
  enhancedPostLogs,
  // User
  users,
  brandPurpose,
  verificationCodes,
  giftCertificates,
  giftCertificateActionLog,
  // Analytics
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
  insertPostLedgerSchema,
  insertPostLogSchema
};
