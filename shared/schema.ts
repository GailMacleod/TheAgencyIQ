import { pgTable, text, serial, timestamp, integer, boolean, jsonb, varchar, index, numeric } from "drizzle-orm/pg-core";
import { eq } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";

export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull()
  },
  (table) => [index("IDX_session_expire").on(table.expire)]
);

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id", { length: 15 }).notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  phone: text("phone"),
  subscriptionPlan: text("subscription_plan"),
  subscriptionStart: timestamp("subscription_start"),
  remainingPosts: integer("remaining_posts").default(0),
  totalPosts: integer("total_posts").default(0),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  subscriptionSource: text("subscription_source").default("legacy"),
  subscriptionActive: boolean("subscription_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const postSchedule = pgTable("post_schedule", {
  postId: text("post_id").primaryKey(),
  userId: text("user_id").notNull(),
  content: text("content").notNull(),
  platform: text("platform").notNull(),
  status: text("status").notNull().default("draft"),
  isCounted: boolean("is_counted").notNull().default(false),
  scheduledAt: timestamp("scheduled_at"),
  createdAt: timestamp("created_at").defaultNow(),
  hasVideo: boolean("has_video").default(false),
  videoApproved: boolean("video_approved").default(false),
  videoData: jsonb("video_data"),
  approvedAt: timestamp("approved_at"),
  grokEnhanced: boolean("grok_enhanced").default(false),
  editable: boolean("editable").default(false),
  wittyStyle: boolean("witty_style").default(false),
  edited: boolean("edited").default(false),
  editedAt: timestamp("edited_at")
});

export const postLedger2 = pgTable("post_ledger", {
  userId: text("user_id").primaryKey(),
  subscriptionTier: text("subscription_tier").notNull(),
  periodStart: timestamp("period_start").notNull(),
  quota: integer("quota").notNull(),
  usedPosts: integer("used_posts").notNull().default(0),
  lastPosted: timestamp("last_posted"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const videoUsage = pgTable("video_usage", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id", { length: 50 }).notNull(),
  operationId: varchar("operation_id", { length: 100 }).notNull(),
  durationSeconds: integer("duration_seconds").notNull().default(0),
  costUsd: numeric("cost_usd", { precision: 10, scale: 4 }).notNull().default("0.0000"),
  createdAt: timestamp("created_at").defaultNow()
}, (table) => [
  index("video_usage_user_date_idx").on(table.userId, table.createdAt),
  index("video_usage_operation_idx").on(table.operationId)
]);

export const posts = pgTable("posts", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id", { length: 50 }).notNull(),
  platform: text("platform").notNull(),
  content: text("content").notNull(),
  status: text("status").notNull().default("draft"),
  publishedAt: timestamp("published_at"),
  errorLog: text("error_log"),
  analytics: jsonb("analytics"),
  scheduledFor: timestamp("scheduled_for"),
  contentHash: text("content_hash"),
  generationId: text("generation_id"),
  idempotencyKey: text("idempotency_key"),
  aiRecommendation: text("ai_recommendation"),
  subscriptionCycle: text("subscription_cycle"),
  strategicTheme: text("strategic_theme"),
  businessCanvasPhase: text("business_canvas_phase"),
  engagementOptimization: text("engagement_optimization"),
  edited: boolean("edited").default(false),
  editedAt: timestamp("edited_at"),
  createdAt: timestamp("created_at").defaultNow()
});

export const platformConnections = pgTable("platform_connections", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  platform: text("platform").notNull(),
  platformUserId: text("platform_user_id").notNull(),
  platformUsername: text("platform_username").notNull(),
  accessToken: text("access_token").notNull(),
  refreshToken: text("refresh_token"),
  expiresAt: timestamp("expires_at"),
  isActive: boolean("is_active").default(true),
  connectedAt: timestamp("connected_at").defaultNow()
}, (table) => ({
  uniqueUserPlatform: index("unique_user_platform_active").on(table.userId, table.platform).where(eq(table.isActive, true))
}));

export const enhancedOauthTokens = pgTable("enhanced_oauth_tokens", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  platform: text("platform").notNull(),
  accessToken: text("access_token").notNull(),
  refreshToken: text("refresh_token"),
  tokenType: text("token_type").default("Bearer"),
  expiresAt: timestamp("expires_at"),
  scopes: jsonb("scopes"),
  platformData: jsonb("platform_data"),
  lastRefreshed: timestamp("last_refreshed"),
  isValid: boolean("is_valid").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
}, (table) => [
  index("idx_enhanced_oauth_tokens_user_platform").on(table.userId, table.platform),
  index("idx_enhanced_oauth_tokens_expires").on(table.expiresAt)
]);

export const quotaUsage = pgTable("quota_usage", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id", { length: 50 }).notNull(),
  platform: varchar("platform", { length: 50 }).notNull(),
  operation: varchar("operation", { length: 50 }).notNull(),
  hourWindow: timestamp("hour_window").notNull(),
  count: integer("count").default(1),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
}, (table) => [
  index("idx_quota_usage_user_platform").on(table.userId, table.platform),
  index("idx_quota_usage_hour_window").on(table.hourWindow)
]);

export const notificationLogs = pgTable("notification_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  type: text("type").notNull(),
  provider: text("provider").notNull(),
  recipient: text("recipient").notNull(),
  subject: text("subject"),
  content: text("content").notNull(),
  status: text("status").notNull(),
  externalId: text("external_id"),
  errorMessage: text("error_message"),
  sentAt: timestamp("sent_at"),
  createdAt: timestamp("created_at").defaultNow()
}, (table) => [
  index("idx_notification_logs_user").on(table.userId),
  index("idx_notification_logs_status").on(table.status)
]);

export const enhancedPostLogs = pgTable("enhanced_post_logs", {
  id: serial("id").primaryKey(),
  postId: text("post_id").notNull(),
  userId: integer("user_id").notNull().references(() => users.id),
  platform: text("platform").notNull(),
  action: text("action").notNull(),
  attemptNumber: integer("attempt_number").default(1),
  statusCode: integer("status_code"),
  errorCode: text("error_code"),
  errorMessage: text("error_message"),
  platformResponse: jsonb("platform_response"),
  oauthTokenUsed: text("oauth_token_used"),
  processingTime: integer("processing_time"),
  retryAfter: timestamp("retry_after"),
  createdAt: timestamp("created_at").defaultNow()
}, (table) => [
  index("idx_enhanced_post_logs_post_id").on(table.postId),
  index("idx_enhanced_post_logs_user_platform").on(table.userId, table.platform),
  index("idx_enhanced_post_logs_status").on(table.action)
]);

export const brandPurpose = pgTable("brand_purpose", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  brandName: text("brand_name").notNull(),
  productsServices: text("products_services").notNull(),
  corePurpose: text("core_purpose").notNull(),
  audience: text("audience").notNull(),
  jobToBeDone: text("job_to_be_done").notNull(),
  motivations: text("motivations").notNull(),
  painPoints: text("pain_points").notNull(),
  goals: jsonb("goals").notNull(),
  logoUrl: text("logo_url"),
  contactDetails: jsonb("contact_details").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const verificationCodes = pgTable("verification_codes", {
  id: serial("id").primaryKey(),
  phone: text("phone").notNull(),
  code: text("code").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  verified: boolean("verified").default(false),
  createdAt: timestamp("created_at").defaultNow()
});

export const giftCertificates = pgTable("gift_certificates", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 50 }).notNull().unique(),
  plan: varchar("plan", { length: 20 }).notNull(),
  isUsed: boolean("is_used").default(false),
  createdFor: varchar("created_for", { length: 100 }).notNull(),
  createdBy: integer("created_by").references(() => users.id),
  redeemedBy: integer("redeemed_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  redeemedAt: timestamp("redeemed_at")
});

export const giftCertificateActionLog = pgTable("gift_certificate_action_log", {
  id: serial("id").primaryKey(),
  certificateId: integer("certificate_id").notNull().references(() => giftCertificates.id),
  certificateCode: varchar("certificate_code", { length: 50 }).notNull(),
  actionType: varchar("action_type", { length: 30 }).notNull(),
  actionBy: integer("action_by").references(() => users.id),
  actionByEmail: varchar("action_by_email", { length: 255 }),
  actionDetails: jsonb("action_details"),
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  sessionId: varchar("session_id", { length: 100 }),
  success: boolean("success").default(true),
  errorMessage: text("error_message"),
  fraudScore: integer("fraud_score").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull()
});

export const subscriptionAnalytics = pgTable("subscription_analytics", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  subscriptionCycle: text("subscription_cycle").notNull(),
  subscriptionPlan: text("subscription_plan").notNull(),
  totalPostsAllowed: integer("total_posts_allowed").notNull(),
  postsUsed: integer("posts_used").default(0),
  successfulPosts: integer("successful_posts").default(0),
  totalReach: integer("total_reach").default(0),
  totalEngagement: integer("total_engagement").default(0),
  totalImpressions: integer("total_impressions").default(0),
  cycleStartDate: timestamp("cycle_start_date").notNull(),
  cycleEndDate: timestamp("cycle_end_date").notNull(),
  dataRetentionExpiry: timestamp("data_retention_expiry").notNull(),
  createdAt: timestamp("created_at").defaultNow()
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertPostSchema = createInsertSchema(posts).omit({
  id: true,
  createdAt: true
});

export const insertPlatformConnectionSchema = createInsertSchema(platformConnections).omit({
  id: true,
  connectedAt: true
});

export const insertBrandPurposeSchema = createInsertSchema(brandPurpose).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertVerificationCodeSchema = createInsertSchema(verificationCodes).omit({
  id: true,
  createdAt: true
});

export const insertGiftCertificateSchema = createInsertSchema(giftCertificates).omit({
  id: true,
  createdAt: true,
  redeemedAt: true
});

export const insertGiftCertificateActionLogSchema = createInsertSchema(giftCertificateActionLog).omit({
  id: true,
  createdAt: true
});

export const insertSubscriptionAnalyticsSchema = createInsertSchema(subscriptionAnalytics).omit({
  id: true,
  createdAt: true
});

export const insertPostScheduleSchema = createInsertSchema(postSchedule).omit({
  createdAt: true
});

export const insertPostLedgerSchema = createInsertSchema(postLedger2).omit({
  createdAt: true,
  updatedAt: true
});

export const oauthTokens = pgTable("oauth_tokens", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  provider: varchar("provider").notNull(),
  accessToken: text("access_token").notNull(),
  refreshToken: text("refresh_token"),
  expiresAt: timestamp("expires_at"),
  scope: text("scope").array(),
  profileId: varchar("profile_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
}, (table) => [
  index("oauth_tokens_user_provider_idx").on(table.userId, table.provider),
  index("oauth_tokens_expires_idx").on(table.expiresAt)
]);

export const postLogs = pgTable("post_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  postId: integer("post_id").references(() => posts.id),
  platform: text("platform").notNull(),
  status: text("status").notNull(),
  attemptNumber: integer("attempt_number").default(1),
  maxRetries: integer("max_retries").default(3),
  errorCode: text("error_code"),
  errorMessage: text("error_message"),
  platformResponse: jsonb("platform_response"),
  oauthTokenUsed: text("oauth_token_used"),
  retryAfter: timestamp("retry_after"),
  publishedUrl: text("published_url"),
  analytics: jsonb("analytics"),
  processingTimeMs: integer("processing_time_ms"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const insertPostLogSchema = createInsertSchema(postLogs).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
