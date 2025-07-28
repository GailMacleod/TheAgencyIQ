// Platform connections for OAuth tokens with unique constraints
export const platformConnections = pgTable("platform_connections", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
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
