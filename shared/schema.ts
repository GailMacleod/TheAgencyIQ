import { pgTable, text, serial, timestamp, integer, boolean, jsonb, varchar, index, numeric } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { eq } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

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
users,
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

If code is:
if (result.isAsync && result.operationId) {
res.json({
...,
message: 'VEO 3.0 generation initiated - use operation ID to check status'
});
} else {
...
},
