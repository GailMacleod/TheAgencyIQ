import { users, platformConnections, postLedger, videoUsage, posts, enhancedOauthTokens, quotaUsage, notificationLogs, enhancedPostLogs, brandPurpose, verificationCodes, giftCertificates, giftCertificateActionLog, subscriptionAnalytics, insertUserSchema, insertPostSchema, insertPlatformConnectionSchema, insertBrandPurposeSchema, insertVerificationCodeSchema, insertGiftCertificateSchema, insertGiftCertificateActionLogSchema, insertSubscriptionAnalyticsSchema, insertPostScheduleSchema, insertPostLedgerSchema, oauthTokens, postLogs, insertPostLogSchema } from "shared/schema.ts"; // Cleaned duplicate platformConnections

import { db } from "./db";

import { eq, and, desc } from "drizzle-orm";

import bcrypt from 'bcryptjs';  // For hashing in createUser

import crypto from 'crypto';  // For codes in getVerificationCode

import rateLimit from 'express-rate-limit';  // For rate limiting on ops

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 100,
  message: 'Too many requests'
});

// Apply limiter to storage ops if needed (e.g., app.use('/api/storage', limiter));

class DatabaseStorage {
  // User operations
  async getUser(id) {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }
  async getAllUsers() {
    const allUsers = await db.select().from(users);
    return allUsers;
  }
  async getUserByPhone(phone) {
    const [user] = await db.select().from(users).where(eq(users.phone, phone));
    return user;
  }
  async getUserByEmail(email) {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }
  async getUserByStripeSubscriptionId(subscriptionId) {
    const [user] = await db.select().from(users).where(eq(users.stripeSubscriptionId, subscriptionId));
    return user;
  }
  async createUser(insertUser) {
    const hashedPassword = await bcrypt.hash(insertUser.password, 10);  // Hash password
    insertUser.password = hashedPassword;
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }
  async updateUser(id, updates) {
    const [user] = await db.update(users).set({ ...updates, updatedAt: new Date() }).where(eq(users.id, id)).returning();
    return user;
  }
  async updateUserPhone(oldPhone, newPhone) {
    return await db.transaction(async (tx) => {
      const [user] = await tx.update(users).set({
        phone: newPhone,
        updatedAt: new Date()
      }).where(eq(users.phone, oldPhone)).returning();
      if (!user) {
        throw new Error(`User with phone ${oldPhone} not found`);
      }
      await tx.execute(`
        UPDATE post_ledger 
        SET user_id = '${newPhone}' 
        WHERE user_id = '${oldPhone}'
      `);
      await tx.execute(`
        UPDATE post_schedule 
        SET user_id = '${newPhone}' 
        WHERE user_id = '${oldPhone}'
      `);
      console.log(`Successfully migrated all data from ${oldPhone} to ${newPhone}`);
      return user;
    });
  }
  async updateUserStripeInfo(id, stripeCustomerId, stripeSubscriptionId) {
    const [user] = await db.update(users).set({
      stripeCustomerId,
      stripeSubscriptionId,
      updatedAt: new Date()
    }).where(eq(users.id, id)).returning();
    return user;
  }
  async updateStripeCustomerId(userId, stripeCustomerId) {
    const [user] = await db.update(users).set({
      stripeCustomerId,
      updatedAt: new Date()
    }).where(eq(users.id, userId)).returning();
    return user;
  }
  // Post operations
  async getPostsByUser(userId) {
    return await db.select().from(posts).where(eq(posts.userId, userId)).orderBy(desc(posts.scheduledFor));
  }
  async getPostsByUserPaginated(userId, limit, offset) {
    return await db.select().from(posts).where(eq(posts.userId, userId)).orderBy(desc(posts.scheduledFor)).limit(limit).offset(offset);
  }
  async createPost(insertPost) {
    const [post] = await db.insert(posts).values(insertPost).returning();
    return post;
  }
  async updatePost(id, updates) {
    const [post] = await db.update(posts).set(updates).where(eq(posts.id, id)).returning();
    return post;
  }
  async deletePost(id) {
    await db.delete(posts).where(eq(posts.id, id));
  }
  async getPost(postId) {
    const [post] = await db.select().from(posts).where(eq(posts.id, postId));
    return post;
  }
  // Platform connection operations
  async getPlatformConnectionsByUser(userId) {
    return await db.select().from(platformConnections).where(eq(platformConnections.userId, userId));
  }
  async createPlatformConnection(connection) {
    const [platformConnection] = await db.insert(platformConnections).values(connection).returning();
    return platformConnection;
  }
  async updatePlatformConnection(id, updates) {
    const [platformConnection] = await db.update(platformConnections).set(updates).where(eq(platformConnections.id, id)).returning();
    return platformConnection;
  }
  // ENHANCED: Update platform connection token after refresh
  async updatePlatformConnectionToken(userId, platform, accessToken, refreshToken, expiresAt) {
    const userIdNum = parseInt(userId);
    await db.update(platformConnections).set({
      accessToken,
      refreshToken,
      expiresAt: expiresAt || new Date(Date.now() + 24 * 60 * 60 * 1000), // Default 24 hours
      updatedAt: new Date()
    }).where(and(
      eq(platformConnections.userId, userIdNum),
      eq(platformConnections.platform, platform)
    ));
    console.log(`✅ Database updated for ${platform} (User ${userId}): New token expires at ${expiresAt?.toISOString()}`);
  }
  async getPlatformConnection(userId, platform) {
    const [connection] = await db.select().from(platformConnections).where(and(
      eq(platformConnections.userId, userId),
      eq(platformConnections.platform, platform)
    ));
    return connection || undefined;
  }
  async updatePlatformConnectionByPlatform(userId, platform, updates) {
    const [platformConnection] = await db.update(platformConnections).set(updates).where(and(
      eq(platformConnections.userId, userId),
      eq(platformConnections.platform, platform)
    )).returning();
    return platformConnection;
  }
  async getConnectedPlatforms(userId) {
    const connections = await db.select().from(platformConnections).where(eq(platformConnections.userId, userId));
    const connectedPlatforms = {};
    connections.forEach((conn) => {
      connectedPlatforms[conn.platform] = conn.isActive || false;
    });
    return connectedPlatforms;
  }
  async deletePlatformConnection(id) {
    await db.delete(platformConnections).where(eq(platformConnections.id, id));
  }
  // Brand purpose operations
  async getBrandPurposeByUser(userId) {
    const [brandPurposeRecord] = await db.select().from(brandPurpose).where(eq(brandPurpose.userId, userId));
    return brandPurposeRecord;
  }
  async createBrandPurpose(insertBrandPurpose) {
    const [brandPurposeRecord] = await db.insert(brandPurpose).values(insertBrandPurpose).returning();
    return brandPurposeRecord;
  }
  async updateBrandPurpose(id, updates) {
    const [brandPurposeRecord] = await db.update(brandPurpose).set({ ...updates, updatedAt: new Date() }).where(eq(brandPurpose.id, id)).returning();
    return brandPurposeRecord;
  }
  // Verification code operations
  async createVerificationCode(insertCode) {
    const [code] = await db.insert(verificationCodes).values(insertCode).returning();
    return code;
  }
  async getVerificationCode(phone, code) {
    const [verificationCode] = await db.select().from(verificationCodes).where(
      and(
        eq(verificationCodes.phone, phone),
        eq(verificationCodes.code, code)
      )
    ).orderBy(desc(verificationCodes.createdAt)).limit(1);
    return verificationCode;
  }
  async markVerificationCodeUsed(id) {
    await db.update(verificationCodes).set({ verified: true }).where(eq(verificationCodes.id, id));
  }
  // Gift certificate operations with enhanced user tracking
  async createGiftCertificate(insertCertificate, createdBy) {
    const certificateData = {
      ...insertCertificate,
      createdBy
    };
    const [certificate] = await db.insert(giftCertificates).values(certificateData).returning();
    await this.logGiftCertificateAction({
      certificateId: certificate.id,
      certificateCode: certificate.code,
      actionType: 'created',
      actionBy: createdBy,
      actionDetails: {
        plan: certificate.plan,
        createdFor: certificate.createdFor
      },
      success: true
    });
    return certificate;
  }
  async getGiftCertificate(code) {
    const [certificate] = await db.select().from(giftCertificates).where(eq(giftCertificates.code, code));
    return certificate || undefined;
  }
  async redeemGiftCertificate(code, userId) {
    const [certificate] = await db.update(giftCertificates).set({
      isUsed: true,
      redeemedBy: userId,
      redeemedAt: new Date()
    }).where(eq(giftCertificates.code, code)).returning();
    await this.logGiftCertificateAction({
      certificateId: certificate.id,
      certificateCode: certificate.code,
      actionType: 'redeemed',
      actionBy: userId,
      actionDetails: {
        plan: certificate.plan,
        originalCreatedFor: certificate.createdFor
      },
      success: true
    });
    return certificate;
  }
  async getAllGiftCertificates() {
    const certificates = await db.select().from(giftCertificates).orderBy(desc(giftCertificates.createdAt));
    return certificates;
  }
  async getGiftCertificatesByCreator(createdBy) {
    const certificates = await db.select().from(giftCertificates).where(eq(giftCertificates.createdBy, createdBy)).orderBy(desc(giftCertificates.createdAt));
    return certificates;
  }
  async getGiftCertificatesByRedeemer(redeemedBy) {
    const certificates = await db.select().from(giftCertificates).where(eq(giftCertificates.redeemedBy, redeemedBy)).orderBy(desc(giftCertificates.redeemedAt));
    return certificates;
  }
  // Gift certificate action logging
  async logGiftCertificateAction(action) {
    const [logEntry] = await db.insert(giftCertificateActionLog).values(action).returning();
    return logEntry;
  }
  async getGiftCertificateActionLog(certificateId) {
    const logs = await db.select().from(giftCertificateActionLog).where(eq(giftCertificateActionLog.certificateId, certificateId)).orderBy(desc(giftCertificateActionLog.createdAt));
    return logs;
  }
  async getGiftCertificateActionLogByCode(certificateCode) {
    const logs = await db.select().from(giftCertificateActionLog).where(eq(giftCertificateActionLog.certificateCode, certificateCode)).orderBy(desc(giftCertificateActionLog.createdAt));
    return logs;
  }
  async getGiftCertificateActionLogByUser(userId) {
    const logs = await db.select().from(giftCertificateActionLog).where(eq(giftCertificateActionLog.actionBy, userId)).orderBy(desc(giftCertificateActionLog.createdAt));
    return logs;
  }
  async getPlatformConnectionsByPlatformUserId(platformUserId) {
    return await db.select().from(platformConnections).where(eq(platformConnections.platformUserId, platformUserId));
  }
  // Post ledger operations for synchronization
  async getPostLedgerByUser(userId) {
    const [ledger] = await db.select().from(postLedger2).where(eq(postLedger2.userId, userId));
    return ledger;
  }
  async createPostLedger(ledger) {
    const [newLedger] = await db.insert(postLedger2).values(ledger).returning();
    return newLedger;
  }
  async updatePostLedger(userId, updates) {
    const [updatedLedger] = await db.update(postLedger2).set(updates).where(eq(postLedger2.userId, userId)).returning();
    return updatedLedger;
  }
  // OAuth token operations for TokenManager integration
  async storeOAuthToken(userId, provider, tokenData) {
    const { oauthTokens } = await import('@shared/schema');
    await db.insert(oauthTokens).values({
      userId: userId.toString(),
      provider,
      accessToken: tokenData.accessToken,
      refreshToken: tokenData.refreshToken,
      expiresAt: new Date(tokenData.expiresAt),
      scope: tokenData.scope || [],
      profileId: tokenData.profileId
    }).onConflictDoUpdate({
      target: [oauthTokens.userId, oauthTokens.provider],
      set: {
        accessToken: tokenData.accessToken,
        refreshToken: tokenData.refreshToken,
        expiresAt: new Date(tokenData.expiresAt),
        scope: tokenData.scope || []
      }
    });
  }
  async getOAuthToken(userId, provider) {
    const { oauthTokens } = await import('@shared/schema');
    const [token] = await db.select().from(oauthTokens).where(and(
      eq(oauthTokens.userId, userId.toString()),
      eq(oauthTokens.provider, provider)
    ));
    return token || null;
  }
  async getUserOAuthTokens(userId) {
    const { oauthTokens } = await import('@shared/schema');
    const tokens = await db.select().from(oauthTokens).where(eq(oauthTokens.userId, userId.toString()));
    const tokenMap = {};
    tokens.forEach((token) => {
      tokenMap[token.provider] = {
        accessToken: token.accessToken,
        refreshToken: token.refreshToken,
        expiresAt: token.expiresAt?.getTime(),
        scope: token.scope || [],
        provider: token.provider
      };
    });
    return tokenMap;
  }
  async removeOAuthToken(userId, provider) {
    const { oauthTokens } = await import('@shared/schema');
    await db.delete(oauthTokens).where(and(
      eq(oauthTokens.userId, userId.toString()),
      eq(oauthTokens.provider, provider)
    ));
  }
}

export const storage = new DatabaseStorage();
