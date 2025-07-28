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
