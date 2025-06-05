import {
  users,
  posts,
  platformConnections,
  brandPurpose,
  verificationCodes,
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
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, updates: Partial<InsertUser>): Promise<User>;
  updateUserStripeInfo(id: number, stripeCustomerId: string, stripeSubscriptionId: string): Promise<User>;

  // Post operations
  getPostsByUser(userId: number): Promise<Post[]>;
  createPost(post: InsertPost): Promise<Post>;
  updatePost(id: number, updates: Partial<InsertPost>): Promise<Post>;
  deletePost(id: number): Promise<void>;

  // Platform connection operations
  getPlatformConnectionsByUser(userId: number): Promise<PlatformConnection[]>;
  createPlatformConnection(connection: InsertPlatformConnection): Promise<PlatformConnection>;
  updatePlatformConnection(id: number, updates: Partial<InsertPlatformConnection>): Promise<PlatformConnection>;

  // Brand purpose operations
  getBrandPurposeByUser(userId: number): Promise<BrandPurpose | undefined>;
  createBrandPurpose(brandPurpose: InsertBrandPurpose): Promise<BrandPurpose>;
  updateBrandPurpose(id: number, updates: Partial<InsertBrandPurpose>): Promise<BrandPurpose>;

  // Verification code operations
  createVerificationCode(code: InsertVerificationCode): Promise<VerificationCode>;
  getVerificationCode(phone: string, code: string): Promise<VerificationCode | undefined>;
  markVerificationCodeUsed(id: number): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async updateUser(id: number, updates: Partial<InsertUser>): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
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

  // Post operations
  async getPostsByUser(userId: number): Promise<Post[]> {
    return await db
      .select()
      .from(posts)
      .where(eq(posts.userId, userId))
      .orderBy(desc(posts.scheduledFor));
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
          eq(verificationCodes.code, code),
          eq(verificationCodes.verified, false)
        )
      );
    return verificationCode;
  }

  async markVerificationCodeUsed(id: number): Promise<void> {
    await db
      .update(verificationCodes)
      .set({ verified: true })
      .where(eq(verificationCodes.id, id));
  }
}

export const storage = new DatabaseStorage();
