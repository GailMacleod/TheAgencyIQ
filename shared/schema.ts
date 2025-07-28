import { pgTable, text, serial, timestamp, integer, boolean, jsonb, varchar, index, numeric } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { eq } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import * as auth from './authSchema';
import * as post from './postSchema';
import * as user from './userSchema';
import * as analytics from './analyticsSchema';
import * as platform from './platformSchema';

export {
// List all exports explicitly
sessions from './authSchema',
enhancedOauthTokens from './authSchema',
oauthTokens from './authSchema',
postSchedule from './postSchema',
postLedger from './postSchema',
posts from './postSchema',
postLogs from './postSchema',
enhancedPostLogs from './postSchema',
users from './userSchema',
brandPurpose from './userSchema',
verificationCodes from './userSchema',
giftCertificates from './userSchema',
giftCertificateActionLog from './userSchema',
subscriptionAnalytics from './analyticsSchema',
videoUsage from './analyticsSchema',
quotaUsage from './analyticsSchema',
notificationLogs from './analyticsSchema',
platformConnections from './platformSchema',
// Add any insert schemas similarly
insertUserSchema from './userSchema',
insertPostSchema from './postSchema',
// etc. for all insert schemas
};
