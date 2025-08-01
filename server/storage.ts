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
    try {
      const [user] = await db.select().from(users).where(eq(users.id, id));
      return user;
    } catch (err) {
      console.error('Get user failed:', err);
      throw err;
    }
  }
  async getAllUsers() {
    try {
      const allUsers = await db.select().from(users);
      return allUsers;
    } catch (err) {
      console.error('Get all users failed:', err);
      throw err;
    }
  }
  async getUserByPhone(phone) {
    try {
      const [user] = await db.select().from(users).where(eq(users.phone, phone));
      return user;
    } catch (err) {
      console.error('Get user by phone failed:', err);
      throw err;
    }
  }
  async getUserByEmail(email) {
    try {
      const [user] = await db.select().from(users).where(eq(users.email, email));
      return user;
    } catch (err) {
      console.error('Get user by email failed:', err);
      throw err;
    }
  }
  async getUserByStripeSubscriptionId(subscriptionId) {
    try {
      const [user] = await db.select().from(users).where(eq(users.stripeSubscriptionId, subscriptionId));
      return user;
    } catch (err) {
      console.error('Get user by stripe sub failed:', err);
      throw err;
    }
  }
  async createUser(insertUser) {
    try {
      const hashedPassword = await bcrypt.hash(insertUser.password, 10);  // Hash password
      insertUser.password = hashedPassword;
      const [user] = await db.insert(users).values(insertUser).returning();
      return user;
    } catch (err) {
      console.error('Create user failed:', err);
      throw err;
    }
  }
  async updateUser(id, updates) {
    try {
      const [user] = await db.update(users).set({ ...updates, updatedAt: new Date() }).where(eq(users.id, id)).returning();
      return user;
    } catch (err) {
      console.error('Update user failed:', err);
      throw err;
    }
  }
  async updateUserPhone(oldPhone, newPhone) {
    try {
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
    } catch (err) {
      console.error('Update user phone failed:', err);
      throw err;
    }
  }
  async updateUserStripeInfo(id, stripeCustomerId, stripeSubscriptionId) {
    try {
      const [user] = await db.update(users).set({
        stripeCustomerId,
        stripeSubscriptionId,
        updatedAt: new Date()
      }).where(eq(users.id, id)).returning();
      return user;
    } catch (err) {
      console.error('Update stripe info failed:', err);
      throw err;
    }
  }
  async updateStripeCustomerId(userId, stripeCustomerId) {
    try {
      const [user] = await db.update(users).set({
        stripeCustomerId,
        updatedAt: new Date()
      }).where(eq(users.id, userId)).returning();
      return user;
    } catch (err) {
      console.error('Update stripe customer ID failed:', err);
      throw err;
    }
  }
  // Post operations
  async getPostsByUser(userId) {
    try {
      return await db.select().from(posts).where(eq(posts.userId, userId)).orderBy(desc(posts.scheduledFor));
    } catch (err) {
      console.error('Get posts by user failed:', err);
      throw err;
    }
  }
  async getPostsByUserPaginated(userId, limit, offset) {
    try {
      return await db.select().from(posts).where(eq(posts.userId, userId)).orderBy(desc(posts.scheduledFor)).limit(limit).offset(offset);
    } catch (err) {
      console.error('Get posts paginated failed:', err);
      throw err;
    }
  }
  async createPost(insertPost) {
    try {
      const [post] = await db.insert(posts).values(insertPost).returning();
      return post;
    } catch (err) {
      console.error('Create post failed:', err);
      throw err;
    }
  }
  async updatePost(id, updates) {
    try {
      const [post] = await db.update(posts).set(updates).where(eq(posts.id, id)).returning();
      return post;
    } catch (err) {
      console.error('Update post failed:', err);
      throw err;
    }
  }
  async deletePost(id) {
    try {
      await db.delete(posts).where(eq(posts.id, id));
    } catch (err) {
      console.error('Delete post failed:', err);
      throw err;
    }
  }
  async getPost(postId) {
    try {
      const [post] = await db.select().from(posts).where(eq(posts.id, postId));
      return post;
    } catch (err) {
      console.error('Get post failed:', err);
      throw err;
    }
  }
  // Platform connection operations
  async getPlatformConnectionsByUser(userId) {
    try {
      return await db.select().from(platformConnections).where(eq(platformConnections.userId, userId));
    } catch (err) {
      console.error('Get platform connections by user failed:', err);
      throw err;
    }
  }
  async createPlatformConnection(connection) {
    try {
      const [platformConnection] = await db.insert(platformConnections).values(connection).returning();
      return platformConnection;
    } catch (err) {
      console.error('Create platform connection failed:', err);
      throw err;
    }
  }
  async updatePlatformConnection(id, updates) {
    try {
      const [platformConnection] = await db.update(platformConnections).set(updates).where(eq(platformConnections.id, id)).returning();
      return platformConnection;
    } catch (err) {
      console.error('Update platform connection failed:', err);
      throw err;
    }
  }
  // ENHANCED: Update platform connection token after refresh
  async updatePlatformConnectionToken(userId, platform, accessToken, refreshToken, expiresAt) {
    try {
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
    } catch (err) {
      console.error('Update platform connection token failed:', err);
      throw err;
    }
  }
  async getPlatformConnection(userId, platform) {
    try {
      const [connection] = await db.select().from(platformConnections).where(and(
        eq(platformConnections.userId, userId),
        eq(platformConnections.platform, platform)
      ));
      return connection || undefined;
    } catch (err) {
      console.error('Get platform connection failed:', err);
      throw err;
    }
  }
  async updatePlatformConnectionByPlatform(userId, platform, updates) {
    try {
      const [platformConnection] = await db.update(platformConnections).set(updates).where(and(
        eq(platformConnections.userId, userId),
        eq(platformConnections.platform, platform)
      )).returning();
      return platformConnection;
    } catch (err) {
      console.error('Update platform connection by platform failed:', err);
      throw err;
    }
  }
  async getConnectedPlatforms(userId) {
    try {
      const connections = await db.select().from(platformConnections).where(eq(platformConnections.userId, userId));
      const connectedPlatforms = {};
      connections.forEach((conn) => {
        connectedPlatforms[conn.platform] = conn.isActive || false;
      });
      return connectedPlatforms;
    } catch (err) {
      console.error('Get connected platforms failed:', err);
      throw err;
    }
  }
  async deletePlatformConnection(id) {
    try {
      await db.delete(platformConnections).where(eq(platformConnections.id, id));
    } catch (err) {
      console.error('Delete platform connection failed:', err);
      throw err;
    }
  }
  // Brand purpose operations
  async getBrandPurposeByUser(userId) {
    try {
      const [brandPurposeRecord] = await db.select().from(brandPurpose).where(eq(brandPurpose.userId, userId));
      return brandPurposeRecord;
    } catch (err) {
      console.error('Get brand purpose by user failed:', err);
      throw err;
    }
  }
  async createBrandPurpose(insertBrandPurpose) {
    try {
      const [brandPurposeRecord] = await db.insert(brandPurpose).values(insertBrandPurpose).returning();
      return brandPurposeRecord;
    } catch (err) {
      console.error('Create brand purpose failed:', err);
      throw err;
    }
  }
  async updateBrandPurpose(id, updates) {
    try {
      const [brandPurposeRecord] = await db.update(brandPurpose).set({ ...updates, updatedAt: new Date() }).where(eq(brandPurpose.id, id)).returning();
      return brandPurposeRecord;
    } catch (err) {
      console.error('Update brand purpose failed:', err);
      throw err;
    }
  }
  // Verification code operations
  async createVerificationCode(insertCode) {
    try {
      const [code] = await db.insert(verificationCodes).values(insertCode).returning();
      return code;
    } catch (err) {
      console.error('Create verification code failed:', err);
      throw err;
    }
  }
  async getVerificationCode(phone, code) {
    try {
      const [verificationCode] = await db.select().from(verificationCodes).where(
        and(
          eq(verificationCodes.phone, phone),
          eq(verificationCodes.code, code)
        )
      ).orderBy(desc(verificationCodes.createdAt)).limit(1);
      return verificationCode;
    } catch (err) {
      console.error('Get verification code failed:', err);
      throw err;
    }
  }
  async markVerificationCodeUsed(id) {
    try {
      await db.update(verificationCodes).set({ verified: true }).where(eq(verificationCodes.id, id));
    } catch (err) {
      console.error('Mark verification code used failed:', err);
      throw err;
    }
  }
  // Gift certificate operations with enhanced user tracking
  async createGiftCertificate(insertCertificate, createdBy) {
    try {
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
    } catch (err) {
      console.error('Create gift certificate failed:', err);
      throw err;
    }
  }
  async getGiftCertificate(code) {
    try {
      const [certificate] = await db.select().from(giftCertificates).where(eq(giftCertificates.code, code));
      return certificate || undefined;
    } catch (err) {
      console.error('Get gift certificate failed:', err);
      throw err;
    }
  }
  async redeemGiftCertificate(code, userId) {
    try {
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
    } catch (err) {
      console.error('Redeem gift certificate failed:', err);
      throw err;
    }
  }
  async getAllGiftCertificates() {
    try {
      const certificates = await db.select().from(giftCertificates).orderBy(desc(giftCertificates.createdAt));
      return certificates;
    } catch (err) {
      console.error('Get all gift certificates failed:', err);
      throw err;
    }
  }
  async getGiftCertificatesByCreator(createdBy) {
    try {
      const certificates = await db.select().from(giftCertificates).where(eq(giftCertificates.createdBy, createdBy)).orderBy(desc(giftCertificates.createdAt));
      return certificates;
    } catch (err) {
      console.error('Get gift certificates by creator failed:', err);
      throw err;
    }
  }
  async getGiftCertificatesByRedeemer(redeemedBy) {
    try {
      const certificates = await db.select().from(giftCertificates).where(eq(giftCertificates.redeemedBy, redeemedBy)).orderBy(desc(giftCertificates.redeemedAt));
      return certificates;
    } catch (err) {
      console.error('Get gift certificates by redeemer failed:', err);
      throw err;
    }
  }
  // Gift certificate action logging
  async logGiftCertificateAction(action) {
    try {
      const [logEntry] = await db.insert(giftCertificateActionLog).values(action).returning();
      return logEntry;
    } catch (err) {
      console.error('Log gift certificate action failed:', err);
      throw err;
    }
  }
  async getGiftCertificateActionLog(certificateId) {
    try {
      const logs = await db.select().from(giftCertificateActionLog).where(eq(giftCertificateActionLog.certificateId, certificateId)).orderBy(desc(giftCertificateActionLog.createdAt));
      return logs;
    } catch (err) {
      console.error('Get gift certificate action log failed:', err);
      throw err;
    }
  }
  async getGiftCertificateActionLogByCode(certificateCode) {
    try {
      const logs = await db.select().from(giftCertificateActionLog).where(eq(giftCertificateActionLog.certificateCode, certificateCode)).orderBy(desc(giftCertificateActionLog.createdAt));
      return logs;
    } catch (err) {
      console.error('Get gift certificate action log by code failed:', err);
      throw err;
    }
  }
  async getGiftCertificateActionLogByUser(userId) {
    try {
      const logs = await db.select().from(giftCertificateActionLog).where(eq(giftCertificateActionLog.actionBy, userId)).orderBy(desc(giftCertificateActionLog.createdAt));
      return logs;
    } catch (err) {
      console.error('Get gift certificate action log by user failed:', err);
      throw err;
    }
  }
  async getPlatformConnectionsByPlatformUserId(platformUserId) {
    try {
      return await db.select().from(platformConnections).where(eq(platformConnections.platformUserId, platformUserId));
    } catch (err) {
      console.error('Get platform connections by platform user ID failed:', err);
      throw err;
    }
  }
  // Post ledger operations for synchronization
  async getPostLedgerByUser(userId) {
    try {
      const [ledger] = await db.select().from(postLedger2).where(eq(postLedger2.userId, userId));
      return ledger;
    } catch (err) {
      console.error('Get post ledger by user failed:', err);
      throw err;
    }
  }
  async createPostLedger(ledger) {
    try {
      const [newLedger] = await db.insert(postLedger2).values(ledger).returning();
      return newLedger;
    } catch (err) {
      console.error('Create post ledger failed:', err);
      throw err;
    }
  }
  async updatePostLedger(userId, updates) {
    try {
      const [updatedLedger] = await db.update(postLedger2).set(updates).where(eq(postLedger2.userId, userId)).returning();
      return updatedLedger;
    } catch (err) {
      console.error('Update post ledger failed:', err);
      throw err;
    }
  }
  // OAuth token operations for TokenManager integration
  async storeOAuthToken(userId, provider, tokenData) {
    try {
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
    } catch (err) {
      console.error('Store OAuth token failed:', err);
      throw err;
    }
  }
  async getOAuthToken(userId, provider) {
    try {
      const { oauthTokens } = await import('@shared/schema');
      const [token] = await db.select().from(oauthTokens).where(and(
        eq(oauthTokens.userId, userId.toString()),
        eq(oauthTokens.provider, provider)
      ));
      return token || null;
    } catch (err) {
      console.error('Get OAuth token failed:', err);
      throw err;
    }
  }
  async getUserOAuthTokens(userId) {
    try {
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
    } catch (err) {
      console.error('Get user OAuth tokens failed:', err);
      throw err;
    }
  }
  async removeOAuthToken(userId, provider) {
    try {
      const { oauthTokens } = await import('@shared/schema');
      await db.delete(oauthTokens).where(and(
        eq(oauthTokens.userId, userId.toString()),
        eq(oauthTokens.provider, provider)
      ));
    } catch (err) {
      console.error('Remove OAuth token failed:', err);
      throw err;
    }
  }
}

export const storage = new DatabaseStorage();
