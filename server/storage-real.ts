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
import { db } from "./real-db";
import { eq, and, desc, sql } from "drizzle-orm";
import { IStorage } from "./storage";

/**
 * Real PostgreSQL storage implementation
 * Provides bulletproof database operations with proper error handling
 */
export class RealStorage implements IStorage {
  // User operations - phone UID architecture
  async getUser(id: number): Promise<User | undefined> {
    try {
      const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);
      return user;
    } catch (error) {
      console.error('Error getting user:', error);
      return undefined;
    }
  }

  async getAllUsers(): Promise<User[]> {
    try {
      return await db.select().from(users);
    } catch (error) {
      console.error('Error getting all users:', error);
      return [];
    }
  }

  async getUserByPhone(phone: string): Promise<User | undefined> {
    try {
      const [user] = await db.select().from(users).where(eq(users.phone, phone)).limit(1);
      return user;
    } catch (error) {
      console.error('Error getting user by phone:', error);
      return undefined;
    }
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    try {
      const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
      return user;
    } catch (error) {
      console.error('Error getting user by email:', error);
      return undefined;
    }
  }

  async getUserByStripeSubscriptionId(subscriptionId: string): Promise<User | undefined> {
    try {
      const [user] = await db.select().from(users)
        .where(eq(users.stripeSubscriptionId, subscriptionId))
        .limit(1);
      return user;
    } catch (error) {
      console.error('Error getting user by stripe subscription ID:', error);
      return undefined;
    }
  }

  async getUserByStripeCustomerId(stripeCustomerId: string): Promise<User | undefined> {
    try {
      const [user] = await db.select().from(users)
        .where(eq(users.stripeCustomerId, stripeCustomerId))
        .limit(1);
      return user;
    } catch (error) {
      console.error('Error getting user by stripe customer ID:', error);
      return undefined;
    }
  }

  async createUser(user: InsertUser): Promise<User> {
    try {
      const [newUser] = await db.insert(users).values(user).returning();
      return newUser;
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  async updateUser(id: number, updates: Partial<InsertUser>): Promise<User> {
    try {
      const [updatedUser] = await db.update(users)
        .set(updates)
        .where(eq(users.id, id))
        .returning();
      return updatedUser;
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  }

  async updateUserPhone(oldPhone: string, newPhone: string): Promise<User> {
    try {
      const [updatedUser] = await db.update(users)
        .set({ phone: newPhone })
        .where(eq(users.phone, oldPhone))
        .returning();
      return updatedUser;
    } catch (error) {
      console.error('Error updating user phone:', error);
      throw error;
    }
  }

  async updateUserStripeInfo(id: number, stripeCustomerId: string, stripeSubscriptionId: string): Promise<User> {
    try {
      const [updatedUser] = await db.update(users)
        .set({ stripeCustomerId, stripeSubscriptionId })
        .where(eq(users.id, id))
        .returning();
      return updatedUser;
    } catch (error) {
      console.error('Error updating user stripe info:', error);
      throw error;
    }
  }

  async updateStripeCustomerId(userId: number, stripeCustomerId: string): Promise<User> {
    try {
      const [updatedUser] = await db.update(users)
        .set({ stripeCustomerId })
        .where(eq(users.id, userId))
        .returning();
      return updatedUser;
    } catch (error) {
      console.error('Error updating stripe customer ID:', error);
      throw error;
    }
  }

  // Subscription management
  async validateActiveSubscription(userId: number): Promise<boolean> {
    try {
      const user = await this.getUser(userId);
      return user?.subscriptionPlan !== 'free' && user?.subscriptionPlan !== null;
    } catch (error) {
      console.error('Error validating subscription:', error);
      return false;
    }
  }

  async updateQuotaUsage(userId: number, quotaUsed: number): Promise<User> {
    try {
      const [updatedUser] = await db.update(users)
        .set({ quotaUsed })
        .where(eq(users.id, userId))
        .returning();
      return updatedUser;
    } catch (error) {
      console.error('Error updating quota usage:', error);
      throw error;
    }
  }

  async resetMonthlyQuota(userId: number): Promise<User> {
    try {
      const [updatedUser] = await db.update(users)
        .set({ quotaUsed: 0 })
        .where(eq(users.id, userId))
        .returning();
      return updatedUser;
    } catch (error) {
      console.error('Error resetting monthly quota:', error);
      throw error;
    }
  }

  async checkDuplicateSubscription(email: string, stripeCustomerId: string): Promise<boolean> {
    try {
      const duplicates = await db.select().from(users)
        .where(
          and(
            eq(users.email, email),
            eq(users.stripeCustomerId, stripeCustomerId)
          )
        );
      return duplicates.length > 1;
    } catch (error) {
      console.error('Error checking duplicate subscription:', error);
      return false;
    }
  }

  async linkStripeSubscription(userId: number, stripeCustomerId: string, stripeSubscriptionId: string): Promise<User> {
    try {
      const [updatedUser] = await db.update(users)
        .set({ stripeCustomerId, stripeSubscriptionId })
        .where(eq(users.id, userId))
        .returning();
      return updatedUser;
    } catch (error) {
      console.error('Error linking stripe subscription:', error);
      throw error;
    }
  }

  async preventDuplicateSubscription(userId: number): Promise<boolean> {
    try {
      const user = await this.getUser(userId);
      return user?.stripeSubscriptionId === null;
    } catch (error) {
      console.error('Error preventing duplicate subscription:', error);
      return false;
    }
  }

  async set30DayQuotaCycle(userId: number, quotaAmount: number): Promise<User> {
    try {
      const [updatedUser] = await db.update(users)
        .set({ quotaLimit: quotaAmount, quotaUsed: 0 })
        .where(eq(users.id, userId))
        .returning();
      return updatedUser;
    } catch (error) {
      console.error('Error setting 30-day quota cycle:', error);
      throw error;
    }
  }

  // Cleanup operations
  async listAllStripeCustomers(): Promise<User[]> {
    try {
      return await db.select().from(users)
        .where(sql`${users.stripeCustomerId} IS NOT NULL`);
    } catch (error) {
      console.error('Error listing stripe customers:', error);
      return [];
    }
  }

  async getAllStripeCustomers(): Promise<User[]> {
    return this.listAllStripeCustomers();
  }

  async clearDuplicateStripeCustomers(keepUserId: number): Promise<void> {
    try {
      await db.delete(users)
        .where(
          and(
            sql`${users.stripeCustomerId} IS NOT NULL`,
            sql`${users.id} != ${keepUserId}`
          )
        );
    } catch (error) {
      console.error('Error clearing duplicate stripe customers:', error);
      throw error;
    }
  }

  // Scheduling operations
  async createScheduledPost(postData: any): Promise<any> {
    try {
      const [newPost] = await db.insert(postSchedule).values(postData).returning();
      return newPost;
    } catch (error) {
      console.error('Error creating scheduled post:', error);
      throw error;
    }
  }

  // Platform connection creation
  async createPlatformConnection(connectionData: any): Promise<PlatformConnection> {
    try {
      const [newConnection] = await db.insert(platformConnections).values(connectionData).returning();
      return newConnection;
    } catch (error) {
      console.error('Error creating platform connection:', error);
      throw error;
    }
  }

  // Post operations
  async getPostsByUser(userId: number): Promise<Post[]> {
    try {
      return await db.select().from(posts).where(eq(posts.userId, userId));
    } catch (error) {
      console.error('Error getting posts by user:', error);
      return [];
    }
  }

  async getPostsByUserPaginated(userId: number, limit: number, offset: number): Promise<Post[]> {
    try {
      return await db.select().from(posts)
        .where(eq(posts.userId, userId))
        .limit(limit)
        .offset(offset);
    } catch (error) {
      console.error('Error getting paginated posts:', error);
      return [];
    }
  }

  async createPost(post: InsertPost): Promise<Post> {
    try {
      const [newPost] = await db.insert(posts).values(post).returning();
      return newPost;
    } catch (error) {
      console.error('Error creating post:', error);
      throw error;
    }
  }

  async updatePost(id: number, updates: Partial<InsertPost>): Promise<Post> {
    try {
      const [updatedPost] = await db.update(posts)
        .set(updates)
        .where(eq(posts.id, id))
        .returning();
      return updatedPost;
    } catch (error) {
      console.error('Error updating post:', error);
      throw error;
    }
  }

  async deletePost(id: number): Promise<void> {
    try {
      await db.delete(posts).where(eq(posts.id, id));
    } catch (error) {
      console.error('Error deleting post:', error);
      throw error;
    }
  }

  async getPost(postId: number): Promise<Post | undefined> {
    try {
      const [post] = await db.select().from(posts).where(eq(posts.id, postId)).limit(1);
      return post;
    } catch (error) {
      console.error('Error getting post:', error);
      return undefined;
    }
  }

  async getPostsWithPlatformIds(userId: number): Promise<Post[]> {
    try {
      return await db.select().from(posts)
        .where(
          and(
            eq(posts.userId, userId),
            sql`${posts.platformPostId} IS NOT NULL`
          )
        );
    } catch (error) {
      console.error('Error getting posts with platform IDs:', error);
      return [];
    }
  }

  async updatePostPlatformId(postId: number, platformPostId: string, quotaDeducted: boolean): Promise<Post> {
    try {
      const [updatedPost] = await db.update(posts)
        .set({ platformPostId, quotaDeducted })
        .where(eq(posts.id, postId))
        .returning();
      return updatedPost;
    } catch (error) {
      console.error('Error updating post platform ID:', error);
      throw error;
    }
  }

  // Additional methods for comprehensive functionality
  async getPlatformConnections(userId: number): Promise<PlatformConnection[]> {
    try {
      return await db.select().from(platformConnections).where(eq(platformConnections.userId, userId));
    } catch (error) {
      console.error('Error getting platform connections:', error);
      return [];
    }
  }

  async getBrandPurpose(userId: number): Promise<BrandPurpose | undefined> {
    try {
      const [purpose] = await db.select().from(brandPurpose).where(eq(brandPurpose.userId, userId)).limit(1);
      return purpose;
    } catch (error) {
      console.error('Error getting brand purpose:', error);
      return undefined;
    }
  }

  async createBrandPurpose(purpose: InsertBrandPurpose): Promise<BrandPurpose> {
    try {
      const [newPurpose] = await db.insert(brandPurpose).values(purpose).returning();
      return newPurpose;
    } catch (error) {
      console.error('Error creating brand purpose:', error);
      throw error;
    }
  }

  async updateBrandPurpose(userId: number, updates: Partial<InsertBrandPurpose>): Promise<BrandPurpose> {
    try {
      const [updatedPurpose] = await db.update(brandPurpose)
        .set(updates)
        .where(eq(brandPurpose.userId, userId))
        .returning();
      return updatedPurpose;
    } catch (error) {
      console.error('Error updating brand purpose:', error);
      throw error;
    }
  }
}