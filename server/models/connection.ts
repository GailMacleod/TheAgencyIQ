import { pgTable, serial, varchar, text, timestamp, boolean } from 'drizzle-orm/pg-core';

export const connections = pgTable('connections', {
  id: serial('id').primaryKey(),
  userPhone: varchar('user_phone', { length: 12 }).notNull(),
  platform: varchar('platform', { length: 20 }).notNull(),
  platformUserId: varchar('platform_user_id', { length: 50 }),
  accessToken: text('access_token').notNull(),
  refreshToken: text('refresh_token'),
  expiresAt: timestamp('expires_at'),
  isActive: boolean('is_active').default(true),
  connectedAt: timestamp('connected_at').defaultNow()
});

export type Connection = typeof connections.$inferSelect;
export type InsertConnection = typeof connections.$inferInsert;