// OAuth tokens table for comprehensive token management
export const oauthTokens = pgTable("oauth_tokens", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  provider: varchar("provider").notNull(), // google, facebook, linkedin, twitter, youtube
  accessToken: text("access_token").notNull(),
  refreshToken: text("refresh_token"),
  expiresAt: timestamp("expires_at"),
  scope: text("scope").array(),
  profileId: varchar("profile_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("oauth_tokens_user_provider_idx").on(table.userId, table.provider),
  index("oauth_tokens_expires_idx").on(table.expiresAt),
]);
