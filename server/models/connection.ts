import { pgTable, serial, varchar, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Connections table for OAuth platform management
export const connections = pgTable("connections", {
  id: serial("id").primaryKey(),
  userPhone: varchar("user_phone", { length: 12 }).unique().notNull(),
  platform: varchar("platform", { length: 20 }).notNull(),
  platformUserId: varchar("platform_user_id", { length: 50 }),
  accessToken: varchar("access_token", { length: 255 }).notNull(),
  refreshToken: varchar("refresh_token", { length: 255 }),
  expiresAt: timestamp("expires_at"),
  isActive: boolean("is_active").default(true),
  connectedAt: timestamp("connected_at").defaultNow(),
});

// Insert schema for new connections
export const insertConnectionSchema = createInsertSchema(connections).omit({
  id: true,
  connectedAt: true,
});

// Types
export type InsertConnection = z.infer<typeof insertConnectionSchema>;
export type Connection = typeof connections.$inferSelect;