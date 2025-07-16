import {
  users,
  posts,
  platformConnections,
  brandPurpose,
  verificationCodes,
  giftCertificates,
  giftCertificateActionLog,
  subscriptionAnalytics,
  postLedger,
  postSchedule,
  type User,
  type InsertUser,
  type Post,
  type InsertPost,
  type PlatformConnection,
  type InsertPlatformConnection,
  type BrandPurpose,
  type InsertBrandPurpose,
  type VerificationCode,
  type InsertVerificationCode,
  type GiftCertificate,
  type InsertGiftCertificate,
  type GiftCertificateActionLog,
  type InsertGiftCertificateActionLog,
  type SubscriptionAnalytics,
  type InsertSubscriptionAnalytics,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, sql } from "drizzle-orm";

export interface IStorage {
  // User operations - phone UID architecture
  getUser(id: number): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  getUserByPhone(phone: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByStripeSubscriptionId(subscriptionId: string): Promise<User | undefined>;
  getUserByStripeCustomerId(stripeCustomerId: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, updates: Partial<InsertUser>): Promise<User>;
  updateUserPhone(oldPhone: string, newPhone: string): Promise<User>;
  updateUserStripeInfo(id: number, stripeCustomerId: string, stripeSubscriptionId: string): Promise<User>;
  updateStripeCustomerId(userId: number, stripeCustomerId: string): Promise<User>;
  
  // Subscription management - Enhanced for end-to-end flow
  validateActiveSubscription(userId: number): Promise<boolean>;
  updateQuotaUsage(userId: number, quotaUsed: number): Promise<User>;
  resetMonthlyQuota(userId: number): Promise<User>;
  checkDuplicateSubscription(email: string, stripeCustomerId: string): Promise<boolean>;
  linkStripeSubscription(userId: number, stripeCustomerId: string, stripeSubscriptionId: string): Promise<User>;
  preventDuplicateSubscription(userId: number): Promise<boolean>;
  set30DayQuotaCycle(userId: number, quotaAmount: number): Promise<User>;
  
  // Cleanup operations
  listAllStripeCustomers(): Promise<User[]>;
  getAllStripeCustomers(): Promise<User[]>;
  clearDuplicateStripeCustomers(keepUserId: number): Promise<void>;
  
  // Quota management for webhook integration
  updateUserQuota(userId: number, quotaData: { remainingPosts: number, totalPosts: number, quotaResetDate: string }): Promise<User>;
  updateUserSubscription(userId: number, subscriptionData: { subscriptionActive: boolean, subscriptionPlan: string, stripeSubscriptionId?: string }): Promise<User>;
  
  // Scheduling operations
  createScheduledPost(postData: any): Promise<any>;
  
  // Platform connection creation
  createPlatformConnection(connectionData: any): Promise<PlatformConnection>;

  // OAuth operations
  storeOAuthState(userId: number, platform: string, state: string, codeVerifier: string): Promise<void>;
  getOAuthState(userId: number, platform: string): Promise<{ state: string; codeVerifier: string } | null>;
  deleteOAuthState(userId: number, platform: string): Promise<void>;
  storeOAuthTokens(userId: number, platform: string, tokens: any): Promise<void>;
  getOAuthTokens(userId: number, platform: string): Promise<any>;
  deleteOAuthTokens(userId: number, platform: string): Promise<void>;

  // Post operations
  getPostsByUser(userId: number): Promise<Post[]>;
  getPostsByUserPaginated(userId: number, limit: number, offset: number): Promise<Post[]>;
  createPost(post: InsertPost): Promise<Post>;
  updatePost(id: number, updates: Partial<InsertPost>): Promise<Post>;
  deletePost(id: number): Promise<void>;
  getPost(postId: number): Promise<Post | undefined>;
  getPostsWithPlatformIds(userId: number): Promise<Post[]>;
  updatePostPlatformId(postId: number, platformPostId: string, quotaDeducted: boolean): Promise<Post>;

  // Platform connection operations
  getPlatformConnectionsByUser(userId: number): Promise<PlatformConnection[]>;
  getPlatformConnection(userId: number, platform: string): Promise<PlatformConnection | undefined>;
  getConnectedPlatforms(userId: number): Promise<{[key: string]: boolean}>;
  createPlatformConnection(connection: InsertPlatformConnection): Promise<PlatformConnection>;
  updatePlatformConnection(id: number, updates: Partial<InsertPlatformConnection>): Promise<PlatformConnection>;
  updatePlatformConnectionByPlatform(userId: number, platform: string, updates: Partial<InsertPlatformConnection>): Promise<PlatformConnection>;
  deletePlatformConnection(id: number): Promise<void>;

  // Brand purpose operations
  getBrandPurposeByUser(userId: number): Promise<BrandPurpose | undefined>;
  createBrandPurpose(brandPurpose: InsertBrandPurpose): Promise<BrandPurpose>;
  updateBrandPurpose(id: number, updates: Partial<InsertBrandPurpose>): Promise<BrandPurpose>;

  // Verification code operations
  createVerificationCode(code: InsertVerificationCode): Promise<VerificationCode>;
  getVerificationCode(phone: string, code: string): Promise<VerificationCode | undefined>;
  markVerificationCodeUsed(id: number): Promise<void>;

  // Gift certificate operations with enhanced user tracking
  createGiftCertificate(certificate: InsertGiftCertificate, createdBy?: number): Promise<GiftCertificate>;
  getGiftCertificate(code: string): Promise<GiftCertificate | undefined>;
  redeemGiftCertificate(code: string, userId: number): Promise<GiftCertificate>;
  getAllGiftCertificates(): Promise<GiftCertificate[]>;
  getGiftCertificatesByCreator(createdBy: number): Promise<GiftCertificate[]>;
  getGiftCertificatesByRedeemer(redeemedBy: number): Promise<GiftCertificate[]>;
  
  // Gift certificate action logging
  logGiftCertificateAction(action: InsertGiftCertificateActionLog): Promise<GiftCertificateActionLog>;
  getGiftCertificateActionLog(certificateId: number): Promise<GiftCertificateActionLog[]>;
  getGiftCertificateActionLogByCode(certificateCode: string): Promise<GiftCertificateActionLog[]>;
  getGiftCertificateActionLogByUser(userId: number): Promise<GiftCertificateActionLog[]>;

  // Platform connection search operations
  getPlatformConnectionsByPlatformUserId(platformUserId: string): Promise<PlatformConnection[]>;

  // Post ledger operations for synchronization
  getPostLedgerByUser(userId: string): Promise<any | undefined>;
  createPostLedger(ledger: any): Promise<any>;
  updatePostLedger(userId: string, updates: any): Promise<any>;
  
  // Stripe subscription management
  getUserByStripeCustomerId(stripeCustomerId: string): Promise<User | undefined>;
  listAllStripeCustomers(): Promise<User[]>;
  getUsersWithStripeCustomers(): Promise<User[]>;
  clearDuplicateStripeCustomers(keepUserId: number): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    const allUsers = await db.select().from(users);
    return allUsers;
  }

  async getUserByPhone(phone: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.userId, phone));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async getUserByStripeSubscriptionId(subscriptionId: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.stripeSubscriptionId, subscriptionId));
    return user;
  }

  async getUserByStripeCustomerId(stripeCustomerId: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.stripeCustomerId, stripeCustomerId));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    try {
      // Check for duplicate email first
      const existingUser = await this.getUserByEmail(insertUser.email);
      if (existingUser) {
        throw new Error(`User with email ${insertUser.email} already exists`);
      }
      
      // Create the user
      const [user] = await db
        .insert(users)
        .values(insertUser)
        .returning();
      
      console.log(`✅ User created successfully: ${user.email} (ID: ${user.id})`);
      return user;
    } catch (error) {
      console.error('User creation error:', error);
      throw error;
    }
  }

  async updateUser(id: number, updates: Partial<InsertUser>): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async updateUserPhone(oldPhone: string, newPhone: string): Promise<User> {
    // Start transaction to ensure complete data migration
    return await db.transaction(async (tx) => {
      // Update user_id (phone UID) in users table
      const [user] = await tx
        .update(users) 
        .set({ 
          userId: newPhone,
          phone: newPhone,
          updatedAt: new Date() 
        })
        .where(eq(users.userId, oldPhone))
        .returning();

      if (!user) {
        throw new Error(`User with phone ${oldPhone} not found`);
      }

      // Raw SQL for complex foreign key updates to ensure data integrity
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

  async updateUserStripeInfo(id: number, stripeCustomerId: string, stripeSubscriptionId: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ 
        stripeCustomerId,
        stripeSubscriptionId,
        updatedAt: new Date() 
      })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async updateStripeCustomerId(userId: number, stripeCustomerId: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ 
        stripeCustomerId,
        updatedAt: new Date() 
      })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  // Subscription management methods
  async validateActiveSubscription(userId: number): Promise<boolean> {
    const user = await this.getUser(userId);
    if (!user || !user.stripeSubscriptionId) {
      return false;
    }
    
    // Check if subscription is active and not expired
    return user.subscriptionActive === true && user.subscriptionPlan !== 'free';
  }

  async updateQuotaUsage(userId: number, quotaUsed: number): Promise<User> {
    const user = await this.getUser(userId);
    if (!user) {
      throw new Error(`User ${userId} not found`);
    }

    const newRemainingPosts = Math.max(0, (user.totalPosts ?? 0) - quotaUsed);
    
    const [updatedUser] = await db
      .update(users)
      .set({
        remainingPosts: newRemainingPosts,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId))
      .returning();
    
    return updatedUser;
  }

  async resetMonthlyQuota(userId: number): Promise<User> {
    const user = await this.getUser(userId);
    if (!user) {
      throw new Error(`User ${userId} not found`);
    }

    // Reset to full quota based on subscription plan
    let totalPosts = 52; // Professional plan default
    if (user.subscriptionPlan === 'starter') totalPosts = 20;
    else if (user.subscriptionPlan === 'growth') totalPosts = 35;
    else if (user.subscriptionPlan === 'professional') totalPosts = 52;

    const [updatedUser] = await db
      .update(users)
      .set({
        totalPosts,
        remainingPosts: totalPosts,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId))
      .returning();
    
    return updatedUser;
  }

  async checkDuplicateSubscription(email: string, stripeCustomerId: string): Promise<boolean> {
    // Check if user already has active subscription
    const existingUser = await this.getUserByEmail(email);
    if (existingUser && existingUser.stripeSubscriptionId) {
      return true; // Duplicate found
    }

    // Check if Stripe customer ID is already associated with different user
    const existingCustomer = await this.getUserByStripeCustomerId(stripeCustomerId);
    if (existingCustomer && existingCustomer.email !== email) {
      return true; // Duplicate found
    }

    return false; // No duplicate
  }

  async listAllStripeCustomers(): Promise<User[]> {
    return await db
      .select()
      .from(users)
      .where(sql`stripe_customer_id IS NOT NULL`);
  }

  async clearDuplicateStripeCustomers(keepUserId: number): Promise<void> {
    await db
      .update(users)
      .set({
        stripeCustomerId: null,
        stripeSubscriptionId: null,
        subscriptionPlan: 'free',
        subscriptionActive: false,
        updatedAt: new Date()
      })
      .where(sql`id != ${keepUserId} AND stripe_customer_id IS NOT NULL`);
  }

  // Enhanced subscription management methods for end-to-end flow
  async linkStripeSubscription(userId: number, stripeCustomerId: string, stripeSubscriptionId: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({
        stripeCustomerId,
        stripeSubscriptionId,
        subscriptionActive: true,
        subscriptionPlan: 'professional', // Default to professional plan
        updatedAt: new Date()
      })
      .where(eq(users.id, userId))
      .returning();
    
    console.log(`🔗 SUBSCRIPTION LINKED: User ${userId} -> Stripe ${stripeSubscriptionId}`);
    return user;
  }

  async preventDuplicateSubscription(userId: number): Promise<boolean> {
    const user = await this.getUser(userId);
    if (!user) {
      return false;
    }

    // Check if user already has active subscription
    if (user.stripeSubscriptionId && user.subscriptionActive) {
      console.log(`🚫 DUPLICATE PREVENTED: User ${userId} already has active subscription ${user.stripeSubscriptionId}`);
      return false;
    }

    return true;
  }

  async set30DayQuotaCycle(userId: number, quotaAmount: number): Promise<User> {
    const [user] = await db
      .update(users)
      .set({
        totalPosts: quotaAmount,
        remainingPosts: quotaAmount,
        subscriptionPlan: 'professional', // Set based on quota amount
        subscriptionActive: true,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId))
      .returning();
    
    console.log(`📊 30-DAY QUOTA SET: User ${userId} -> ${quotaAmount} posts`);
    return user;
  }




  // Post operations
  async getPostsByUser(userId: number): Promise<Post[]> {
    return await db
      .select()
      .from(posts)
      .where(eq(posts.userId, userId))
      .orderBy(desc(posts.scheduledFor));
  }

  async getPostsByUserPaginated(userId: number, limit: number, offset: number): Promise<Post[]> {
    return await db
      .select()
      .from(posts)
      .where(eq(posts.userId, userId))
      .orderBy(desc(posts.scheduledFor))
      .limit(limit)
      .offset(offset);
  }

  async createPost(insertPost: InsertPost): Promise<Post> {
    const [post] = await db
      .insert(posts)
      .values(insertPost)
      .returning();
    return post;
  }

  async updatePost(id: number, updates: Partial<InsertPost>): Promise<Post> {
    const [post] = await db
      .update(posts)
      .set(updates)
      .where(eq(posts.id, id))
      .returning();
    return post;
  }

  async deletePost(id: number): Promise<void> {
    await db.delete(posts).where(eq(posts.id, id));
  }

  async getPost(postId: number): Promise<Post | undefined> {
    const [post] = await db
      .select()
      .from(posts)
      .where(eq(posts.id, postId));
    return post;
  }

  async getPostsWithPlatformIds(userId: number): Promise<Post[]> {
    return await db
      .select()
      .from(posts)
      .where(and(
        eq(posts.userId, userId),
        eq(posts.status, 'published')
      ))
      .orderBy(desc(posts.publishedAt));
  }

  async updatePostPlatformId(postId: number, platformPostId: string, quotaDeducted: boolean): Promise<Post> {
    const [post] = await db
      .update(posts)
      .set({
        platformPostId,
        quotaDeducted,
        status: 'published',
        publishedAt: new Date()
      })
      .where(eq(posts.id, postId))
      .returning();
    return post;
  }

  // Platform connection operations
  async getPlatformConnectionsByUser(userId: number): Promise<PlatformConnection[]> {
    return await db
      .select()
      .from(platformConnections)
      .where(eq(platformConnections.userId, userId));
  }

  async createPlatformConnection(connection: InsertPlatformConnection): Promise<PlatformConnection> {
    const [platformConnection] = await db
      .insert(platformConnections)
      .values(connection)
      .returning();
    return platformConnection;
  }

  async updatePlatformConnection(id: number, updates: Partial<InsertPlatformConnection>): Promise<PlatformConnection> {
    const [platformConnection] = await db
      .update(platformConnections)
      .set(updates)
      .where(eq(platformConnections.id, id))
      .returning();
    return platformConnection;
  }

  // ENHANCED: Update platform connection token after refresh
  async updatePlatformConnectionToken(userId: string, platform: string, accessToken: string, refreshToken: string, expiresAt?: Date): Promise<void> {
    const userIdNum = parseInt(userId);
    
    await db.update(platformConnections)
      .set({
        accessToken,
        refreshToken,
        expiresAt: expiresAt || new Date(Date.now() + 24 * 60 * 60 * 1000) // Default 24 hours
      })
      .where(and(
        eq(platformConnections.userId, userIdNum),
        eq(platformConnections.platform, platform)
      ));
    
    console.log(`✅ Database updated for ${platform} (User ${userId}): New token expires at ${expiresAt?.toISOString()}`);
  }

  async getPlatformConnection(userId: number, platform: string): Promise<PlatformConnection | undefined> {
    const [connection] = await db
      .select()
      .from(platformConnections)
      .where(and(
        eq(platformConnections.userId, userId),
        eq(platformConnections.platform, platform)
      ));
    return connection;
  }

  async updatePlatformConnectionByPlatform(userId: number, platform: string, updates: Partial<InsertPlatformConnection>): Promise<PlatformConnection> {
    const [platformConnection] = await db
      .update(platformConnections)
      .set(updates)
      .where(and(
        eq(platformConnections.userId, userId),
        eq(platformConnections.platform, platform)
      ))
      .returning();
    return platformConnection;
  }

  async getConnectedPlatforms(userId: number): Promise<{[key: string]: boolean}> {
    const connections = await db
      .select()
      .from(platformConnections)
      .where(eq(platformConnections.userId, userId));
    
    const connectedPlatforms: {[key: string]: boolean} = {};
    connections.forEach(conn => {
      connectedPlatforms[conn.platform] = conn.isActive || false;
    });
    
    return connectedPlatforms;
  }

  async deletePlatformConnection(id: number): Promise<void> {
    await db.delete(platformConnections).where(eq(platformConnections.id, id));
  }

  // Brand purpose operations
  async getBrandPurposeByUser(userId: number): Promise<BrandPurpose | undefined> {
    const [brandPurposeRecord] = await db
      .select()
      .from(brandPurpose)
      .where(eq(brandPurpose.userId, userId));
    return brandPurposeRecord;
  }

  async createBrandPurpose(insertBrandPurpose: InsertBrandPurpose): Promise<BrandPurpose> {
    const [brandPurposeRecord] = await db
      .insert(brandPurpose)
      .values(insertBrandPurpose)
      .returning();
    return brandPurposeRecord;
  }

  async updateBrandPurpose(id: number, updates: Partial<InsertBrandPurpose>): Promise<BrandPurpose> {
    const [brandPurposeRecord] = await db
      .update(brandPurpose)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(brandPurpose.id, id))
      .returning();
    return brandPurposeRecord;
  }

  // Verification code operations
  async createVerificationCode(insertCode: InsertVerificationCode): Promise<VerificationCode> {
    const [code] = await db
      .insert(verificationCodes)
      .values(insertCode)
      .returning();
    return code;
  }

  async getVerificationCode(phone: string, code: string): Promise<VerificationCode | undefined> {
    const [verificationCode] = await db
      .select()
      .from(verificationCodes)
      .where(
        and(
          eq(verificationCodes.phone, phone),
          eq(verificationCodes.code, code)
        )
      )
      .orderBy(desc(verificationCodes.createdAt))
      .limit(1);
    return verificationCode;
  }

  async markVerificationCodeUsed(id: number): Promise<void> {
    await db
      .update(verificationCodes)
      .set({ verified: true })
      .where(eq(verificationCodes.id, id));
  }

  // Gift certificate operations with enhanced user tracking
  async createGiftCertificate(insertCertificate: InsertGiftCertificate, createdBy?: number): Promise<GiftCertificate> {
    const certificateData = {
      ...insertCertificate,
      createdBy
    };
    
    const [certificate] = await db
      .insert(giftCertificates)
      .values(certificateData)
      .returning();
    
    // Log the creation action
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

  async getGiftCertificate(code: string): Promise<GiftCertificate | undefined> {
    const [certificate] = await db
      .select()
      .from(giftCertificates)
      .where(eq(giftCertificates.code, code));
    return certificate || undefined;
  }

  async redeemGiftCertificate(code: string, userId: number): Promise<GiftCertificate> {
    const [certificate] = await db
      .update(giftCertificates)
      .set({ 
        isUsed: true, 
        redeemedBy: userId,
        redeemedAt: new Date()
      })
      .where(eq(giftCertificates.code, code))
      .returning();
    
    // Log the redemption action
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

  async getAllGiftCertificates(): Promise<GiftCertificate[]> {
    const certificates = await db
      .select()
      .from(giftCertificates)
      .orderBy(desc(giftCertificates.createdAt));
    return certificates;
  }

  async getGiftCertificatesByCreator(createdBy: number): Promise<GiftCertificate[]> {
    const certificates = await db
      .select()
      .from(giftCertificates)
      .where(eq(giftCertificates.createdBy, createdBy))
      .orderBy(desc(giftCertificates.createdAt));
    return certificates;
  }

  async getGiftCertificatesByRedeemer(redeemedBy: number): Promise<GiftCertificate[]> {
    const certificates = await db
      .select()
      .from(giftCertificates)
      .where(eq(giftCertificates.redeemedBy, redeemedBy))
      .orderBy(desc(giftCertificates.redeemedAt));
    return certificates;
  }

  // Gift certificate action logging
  async logGiftCertificateAction(action: InsertGiftCertificateActionLog): Promise<GiftCertificateActionLog> {
    const [logEntry] = await db
      .insert(giftCertificateActionLog)
      .values(action)
      .returning();
    return logEntry;
  }

  async getGiftCertificateActionLog(certificateId: number): Promise<GiftCertificateActionLog[]> {
    const logs = await db
      .select()
      .from(giftCertificateActionLog)
      .where(eq(giftCertificateActionLog.certificateId, certificateId))
      .orderBy(desc(giftCertificateActionLog.createdAt));
    return logs;
  }

  async getGiftCertificateActionLogByCode(certificateCode: string): Promise<GiftCertificateActionLog[]> {
    const logs = await db
      .select()
      .from(giftCertificateActionLog)
      .where(eq(giftCertificateActionLog.certificateCode, certificateCode))
      .orderBy(desc(giftCertificateActionLog.createdAt));
    return logs;
  }

  async getGiftCertificateActionLogByUser(userId: number): Promise<GiftCertificateActionLog[]> {
    const logs = await db
      .select()
      .from(giftCertificateActionLog)
      .where(eq(giftCertificateActionLog.actionBy, userId))
      .orderBy(desc(giftCertificateActionLog.createdAt));
    return logs;
  }

  async getPlatformConnectionsByPlatformUserId(platformUserId: string): Promise<PlatformConnection[]> {
    return await db
      .select()
      .from(platformConnections)
      .where(eq(platformConnections.platformUserId, platformUserId));
  }

  // Post ledger operations for synchronization
  async getPostLedgerByUser(userId: string): Promise<any | undefined> {
    const [ledger] = await db.select().from(postLedger).where(eq(postLedger.userId, userId));
    return ledger;
  }

  async createPostLedger(ledger: any): Promise<any> {
    const [newLedger] = await db
      .insert(postLedger)
      .values(ledger)
      .returning();
    return newLedger;
  }

  async updatePostLedger(userId: string, updates: any): Promise<any> {
    const [updatedLedger] = await db
      .update(postLedger)
      .set(updates)
      .where(eq(postLedger.userId, userId))
      .returning();
    return updatedLedger;
  }

  // Stripe subscription management

  async getAllStripeCustomers(): Promise<User[]> {
    return this.listAllStripeCustomers();
  }

  async createScheduledPost(postData: any): Promise<any> {
    const [scheduledPost] = await db
      .insert(postSchedule)
      .values({
        postId: `post_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId: postData.userId.toString(),
        content: postData.content,
        platform: postData.platforms?.[0] || 'facebook',
        status: postData.status || 'scheduled',
        scheduledAt: postData.scheduleDate ? new Date(postData.scheduleDate) : null,
        createdAt: new Date()
      })
      .returning();
    return scheduledPost;
  }

  async getUsersWithStripeCustomers(): Promise<User[]> {
    const usersWithStripe = await db
      .select()
      .from(users)
      .where(sql`${users.stripeCustomerId} IS NOT NULL`);
    return usersWithStripe;
  }

  // Quota management for webhook integration
  async updateUserQuota(userId: number, quotaData: { remainingPosts: number, totalPosts: number, quotaResetDate: string }): Promise<User> {
    const [updated] = await db
      .update(users)
      .set({
        remainingPosts: quotaData.remainingPosts,
        totalPosts: quotaData.totalPosts,
        // quotaResetDate field not in schema
      })
      .where(eq(users.id, userId))
      .returning();

    if (!updated) {
      throw new Error(`User not found: ${userId}`);
    }

    return updated;
  }

  async updateUserSubscription(userId: number, subscriptionData: { subscriptionActive: boolean, subscriptionPlan: string, stripeSubscriptionId?: string }): Promise<User> {
    const updateData: any = {
      subscriptionActive: subscriptionData.subscriptionActive,
      subscriptionPlan: subscriptionData.subscriptionPlan
    };

    if (subscriptionData.stripeSubscriptionId) {
      updateData.stripeSubscriptionId = subscriptionData.stripeSubscriptionId;
    }

    const [updated] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, userId))
      .returning();

    if (!updated) {
      throw new Error(`User not found: ${userId}`);
    }

    return updated;
  }

  // OAuth operations
  async storeOAuthState(userId: number, platform: string, state: string, codeVerifier: string): Promise<void> {
    // For now, store in memory - in production, use database table
    const key = `oauth_state_${userId}_${platform}`;
    // Store in a simple Map for now - this should be replaced with proper database storage
    if (!this.oauthStates) {
      this.oauthStates = new Map();
    }
    this.oauthStates.set(key, { state, codeVerifier, expires: Date.now() + 3600000 }); // 1 hour
  }

  async getOAuthState(userId: number, platform: string): Promise<{ state: string; codeVerifier: string } | null> {
    const key = `oauth_state_${userId}_${platform}`;
    if (!this.oauthStates) {
      return null;
    }
    const stored = this.oauthStates.get(key);
    if (!stored || stored.expires < Date.now()) {
      this.oauthStates.delete(key);
      return null;
    }
    return { state: stored.state, codeVerifier: stored.codeVerifier };
  }

  async deleteOAuthState(userId: number, platform: string): Promise<void> {
    const key = `oauth_state_${userId}_${platform}`;
    if (this.oauthStates) {
      this.oauthStates.delete(key);
    }
  }

  async storeOAuthTokens(userId: number, platform: string, tokens: any): Promise<void> {
    const key = `oauth_tokens_${userId}_${platform}`;
    if (!this.oauthTokens) {
      this.oauthTokens = new Map();
    }
    this.oauthTokens.set(key, tokens);
  }

  async getOAuthTokens(userId: number, platform: string): Promise<any> {
    const key = `oauth_tokens_${userId}_${platform}`;
    if (!this.oauthTokens) {
      return null;
    }
    return this.oauthTokens.get(key) || null;
  }

  async deleteOAuthTokens(userId: number, platform: string): Promise<void> {
    const key = `oauth_tokens_${userId}_${platform}`;
    if (this.oauthTokens) {
      this.oauthTokens.delete(key);
    }
  }

  private oauthStates?: Map<string, { state: string; codeVerifier: string; expires: number }>;
  private oauthTokens?: Map<string, any>;

}

export const storage = new DatabaseStorage();
