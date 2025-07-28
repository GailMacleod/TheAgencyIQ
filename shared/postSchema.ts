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
  subscriptionTier: text("subscription_tier").notNull(), // 'starter', 'growth', 'professional'
  periodStart: timestamp("period_start").notNull(),
  quota: integer("quota").notNull(), // 10, 20, 30 (updated July 25, 2025)
  usedPosts: integer("used_posts").notNull().default(0),
  lastPosted: timestamp("last_posted"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// VEO 3.0 usage tracking for cost control
export const videoUsage = pgTable("video_usage", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id", { length: 50 }).notNull(),
  operationId: varchar("operation_id", { length: 100 }).notNull(),
  durationSeconds: integer("duration_seconds").notNull().default(0),
  costUsd: numeric("cost_usd", { precision: 10, scale: 4 }).notNull().default("0.0000"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("video_usage_user_date_idx").on(table.userId, table.createdAt),
  index("video_usage_operation_idx").on(table.operationId),
]);

// Legacy posts table (keeping for backward compatibility)
export const posts = pgTable("posts", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id", { length: 50 }).notNull(),
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
