import { pgTable, text, serial, timestamp, integer, boolean, jsonb, varchar, index } from "drizzle-orm/pg-core";
import { eq } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table for express-session
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// Users table with secure ID management for customer onboarding
export const users = pgTable("users", {
  id: varchar("id").primaryKey().notNull(), // Secure string ID from OAuth
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  subscriptionPlan: text("subscription_plan"), // 'starter', 'growth', 'professional'
  subscriptionStart: timestamp("subscription_start"),
  remainingPosts: integer("remaining_posts").default(0),
  totalPosts: integer("total_posts").default(0),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  subscriptionSource: text("subscription_source").default("legacy"), // 'none', 'stripe', 'certificate', 'legacy'
  subscriptionActive: boolean("subscription_active").default(true),
  // Onboarding tracking
  onboardingCompleted: boolean("onboarding_completed").default(false),
  onboardingStep: text("onboarding_step").default("profile"), // 'profile', 'brand', 'oauth', 'complete'
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Post schedule table for quota enforcement with mobile UID
export const postSchedule = pgTable("post_schedule", {
  postId: text("post_id").primaryKey(), // UUID
  userId: text("user_id").notNull(), // Mobile number UID
  content: text("content").notNull(),
  platform: text("platform").notNull(), // 'facebook', 'instagram', 'linkedin', 'youtube', 'x'
  status: text("status").notNull().default("draft"), // 'draft', 'approved', 'scheduled', 'posted'
  isCounted: boolean("is_counted").notNull().default(false), // True only if posted successfully
  scheduledAt: timestamp("scheduled_at"),
  createdAt: timestamp("created_at").defaultNow(),
  // Video approval fields
  hasVideo: boolean("has_video").default(false),
  videoApproved: boolean("video_approved").default(false),
  videoData: jsonb("video_data"), // Stores video metadata, URL, Art Director info
  approvedAt: timestamp("approved_at"), // When user approved this post+video combination
  // Grok Copywriter enhancements for video content
  grokEnhanced: boolean("grok_enhanced").default(false),
  editable: boolean("editable").default(false),
  wittyStyle: boolean("witty_style").default(false),
  // Edit tracking for UI state management
  edited: boolean("edited").default(false),
  editedAt: timestamp("edited_at")
});

// Post ledger for 30-day rolling quota tracking
export const postLedger = pgTable("post_ledger", {
  userId: text("user_id").primaryKey(), // Mobile number UID
  subscriptionTier: text("subscription_tier").notNull(), // 'starter', 'growth', 'pro'
  periodStart: timestamp("period_start").notNull(),
  quota: integer("quota").notNull(), // 12, 27, 52
  usedPosts: integer("used_posts").notNull().default(0),
  lastPosted: timestamp("last_posted"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Quota tracking table for atomic operations (PostgreSQL-based)
export const quotaUsage = pgTable("quota_usage", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  platform: text("platform").notNull(), // 'facebook', 'instagram', 'linkedin', 'youtube', 'x', 'video', 'api'
  operation: text("operation").notNull(), // 'post', 'call', 'video', 'generation'
  hourWindow: timestamp("hour_window").notNull(), // Truncated to hour for time-based limits
  count: integer("count").notNull().default(1),
  lastUsed: timestamp("last_used").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  // Unique constraint for atomic updates
  uniqueQuotaWindow: index("unique_quota_window").on(table.userId, table.platform, table.operation, table.hourWindow),
}));

// Legacy posts table (keeping for backward compatibility)
export const posts = pgTable("posts", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  platform: text("platform").notNull(), // 'facebook', 'instagram', 'linkedin', 'youtube', 'x'
  content: text("content").notNull(),
  status: text("status").notNull().default("draft"), // 'draft', 'approved', 'scheduled', 'published', 'failed'
  publishedAt: timestamp("published_at"),
  errorLog: text("error_log"),
  analytics: jsonb("analytics"), // Store analytics data: { reach: number, engagement: number, impressions: number }
  scheduledFor: timestamp("scheduled_for"),
  // Idempotency and duplication prevention
  contentHash: text("content_hash"), // MD5 hash of content for duplicate detection
  generationId: text("generation_id"), // Unique ID for each generation batch
  idempotencyKey: text("idempotency_key"), // Unique key for preventing duplicate creation
  aiRecommendation: text("ai_recommendation"),
  subscriptionCycle: text("subscription_cycle"), // Track which 30-day cycle this post belongs to
  // Strategic content generation fields for two-stage Grok workflow
  strategicTheme: text("strategic_theme"), // Media planner strategic reason
  businessCanvasPhase: text("business_canvas_phase"), // Event alignment
  engagementOptimization: text("engagement_optimization"), // ROI potential
  // Edit tracking for UI state management
  edited: boolean("edited").default(false),
  editedAt: timestamp("edited_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Platform connections for OAuth tokens with unique constraints
export const platformConnections = pgTable("platform_connections", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  platform: text("platform").notNull(), // 'facebook', 'instagram', 'linkedin', 'youtube', 'x'
  platformUserId: text("platform_user_id").notNull(),
  platformUsername: text("platform_username").notNull(),
  accessToken: text("access_token").notNull(),
  refreshToken: text("refresh_token"),
  expiresAt: timestamp("expires_at"),
  isActive: boolean("is_active").default(true),
  connectedAt: timestamp("connected_at").defaultNow(),
}, (table) => ({
  // UNIQUE CONSTRAINT: Prevent duplicate active connections per user-platform
  uniqueUserPlatform: index("unique_user_platform_active").on(table.userId, table.platform).where(eq(table.isActive, true)),
}));

// Brand purpose for content generation
export const brandPurpose = pgTable("brand_purpose", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  businessName: text("business_name").notNull(), // Fixed field name
  brandName: text("brand_name").notNull(),
  productsServices: text("products_services").notNull(),
  corePurpose: text("core_purpose").notNull(),
  audience: text("audience").notNull(),
  jobToBeDone: text("job_to_be_done").notNull(),
  motivations: text("motivations").notNull(),
  painPoints: text("pain_points").notNull(),
  goals: jsonb("goals").notNull(), // { driveTraffic: boolean, websiteUrl?: string, buildBrand: boolean, makeSales: boolean, salesUrl?: string, informEducate: boolean, keyMessage?: string }
  logoUrl: text("logo_url"),
  contactDetails: jsonb("contact_details").notNull(), // { email?: string, phone?: string }
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// OAuth tokens table for secure token management
export const oauthTokens = pgTable("oauth_tokens", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  provider: text("provider").notNull(), // OAuth provider name
  platform: text("platform").notNull(), // 'facebook', 'instagram', 'linkedin', 'youtube', 'x'
  accessToken: text("access_token").notNull(),
  refreshToken: text("refresh_token"),
  expiresAt: timestamp("expires_at"),
  scope: text("scope").array(), // Array of granted scopes
  profileId: text("profile_id"), // Platform-specific user ID
  isValid: boolean("is_valid").default(true), // Token validity status
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  // Unique constraint for user-platform combination
  uniqueUserPlatform: index("unique_user_platform_oauth").on(table.userId, table.platform),
}));

// Verification codes for phone verification
export const verificationCodes = pgTable("verification_codes", {
  id: serial("id").primaryKey(),
  phone: text("phone").notNull(),
  code: text("code").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  verified: boolean("verified").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const giftCertificates = pgTable("gift_certificates", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 50 }).notNull().unique(),
  plan: varchar("plan", { length: 20 }).notNull(),
  isUsed: boolean("is_used").default(false),
  createdFor: varchar("created_for", { length: 100 }).notNull(),
  createdBy: integer("created_by").references(() => users.id), // Track who created the certificate
  redeemedBy: integer("redeemed_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  redeemedAt: timestamp("redeemed_at"),
});

// Gift Certificate Action Log for comprehensive tracking
export const giftCertificateActionLog = pgTable("gift_certificate_action_log", {
  id: serial("id").primaryKey(),
  certificateId: integer("certificate_id").notNull().references(() => giftCertificates.id),
  certificateCode: varchar("certificate_code", { length: 50 }).notNull(),
  actionType: varchar("action_type", { length: 30 }).notNull(), // 'created', 'redeemed', 'viewed', 'attempted_redeem'
  actionBy: integer("action_by").references(() => users.id), // NULL for anonymous actions
  actionByEmail: varchar("action_by_email", { length: 255 }), // Track email for non-users
  actionDetails: jsonb("action_details"), // Store additional context
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  sessionId: varchar("session_id", { length: 100 }),
  success: boolean("success").default(true),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Subscription Analytics table for tracking post performance and limits
export const subscriptionAnalytics = pgTable("subscription_analytics", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  subscriptionCycle: text("subscription_cycle").notNull(), // Format: 'YYYY-MM-DD'
  subscriptionPlan: text("subscription_plan").notNull(), // 'starter', 'growth', 'professional'
  totalPostsAllowed: integer("total_posts_allowed").notNull(),
  postsUsed: integer("posts_used").default(0),
  successfulPosts: integer("successful_posts").default(0),
  totalReach: integer("total_reach").default(0),
  totalEngagement: integer("total_engagement").default(0),
  totalImpressions: integer("total_impressions").default(0),
  cycleStartDate: timestamp("cycle_start_date").notNull(),
  cycleEndDate: timestamp("cycle_end_date").notNull(),
  dataRetentionExpiry: timestamp("data_retention_expiry").notNull(), // 3 months after cycle end
  createdAt: timestamp("created_at").defaultNow(),
});

// Create insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPostSchema = createInsertSchema(posts).omit({
  id: true,
  createdAt: true,
});

export const insertPlatformConnectionSchema = createInsertSchema(platformConnections).omit({
  id: true,
  connectedAt: true,
});

export const insertBrandPurposeSchema = createInsertSchema(brandPurpose).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertOAuthTokenSchema = createInsertSchema(oauthTokens).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Export types for OAuth tokens and brand purpose
export type OAuthToken = typeof oauthTokens.$inferSelect;
export type InsertOAuthToken = typeof oauthTokens.$inferInsert;
export type BrandPurpose = typeof brandPurpose.$inferSelect;
export type InsertBrandPurpose = typeof brandPurpose.$inferInsert;
export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const insertVerificationCodeSchema = createInsertSchema(verificationCodes).omit({
  id: true,
  createdAt: true,
});

export const insertGiftCertificateSchema = createInsertSchema(giftCertificates).omit({
  id: true,
  createdAt: true,
  redeemedAt: true,
});

export const insertGiftCertificateActionLogSchema = createInsertSchema(giftCertificateActionLog).omit({
  id: true,
  createdAt: true,
});

export const insertSubscriptionAnalyticsSchema = createInsertSchema(subscriptionAnalytics).omit({
  id: true,
  createdAt: true,
});

export const insertPostScheduleSchema = createInsertSchema(postSchedule).omit({
  createdAt: true,
});

export const insertPostLedgerSchema = createInsertSchema(postLedger).omit({
  createdAt: true,
  updatedAt: true,
});

// Additional types
export type Post = typeof posts.$inferSelect;
export type InsertPost = z.infer<typeof insertPostSchema>;
export type PostSchedule = typeof postSchedule.$inferSelect;
export type InsertPostSchedule = z.infer<typeof insertPostScheduleSchema>;
export type PostLedger = typeof postLedger.$inferSelect;
export type InsertPostLedger = z.infer<typeof insertPostLedgerSchema>;
export type PlatformConnection = typeof platformConnections.$inferSelect;
export type InsertPlatformConnection = z.infer<typeof insertPlatformConnectionSchema>;
export type BrandPurpose = typeof brandPurpose.$inferSelect;
export type InsertBrandPurpose = z.infer<typeof insertBrandPurposeSchema>;
export type VerificationCode = typeof verificationCodes.$inferSelect;
export type InsertVerificationCode = z.infer<typeof insertVerificationCodeSchema>;
export type GiftCertificate = typeof giftCertificates.$inferSelect;
export type InsertGiftCertificate = z.infer<typeof insertGiftCertificateSchema>;
export type GiftCertificateActionLog = typeof giftCertificateActionLog.$inferSelect;
export type InsertGiftCertificateActionLog = z.infer<typeof insertGiftCertificateActionLogSchema>;
export type SubscriptionAnalytics = typeof subscriptionAnalytics.$inferSelect;
export type InsertSubscriptionAnalytics = z.infer<typeof insertSubscriptionAnalyticsSchema>;

// Post logs table for auto-posting tracking and error handling
export const postLogs = pgTable("post_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  postId: integer("post_id").references(() => posts.id),
  platform: text("platform").notNull(), // 'facebook', 'instagram', 'linkedin', 'youtube', 'x'
  content: text("content").notNull(),
  status: text("status").notNull(), // 'pending', 'success', 'failed', 'retrying'
  attemptNumber: integer("attempt_number").default(1),
  maxRetries: integer("max_retries").default(3),
  errorCode: text("error_code"), // OAuth error, rate limit, API error codes
  errorMessage: text("error_message"),
  platformResponse: jsonb("platform_response"), // Full platform API response
  oauthTokenUsed: text("oauth_token_used"), // Last 4 chars of token for debugging
  retryAfter: timestamp("retry_after"), // When to retry based on platform response
  publishedUrl: text("published_url"), // URL of published post if successful
  analytics: jsonb("analytics"), // Platform analytics if available
  processingTimeMs: integer("processing_time_ms"), // Performance tracking
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertPostLogSchema = createInsertSchema(postLogs).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type PostLog = typeof postLogs.$inferSelect;
export type InsertPostLog = z.infer<typeof insertPostLogSchema>;
