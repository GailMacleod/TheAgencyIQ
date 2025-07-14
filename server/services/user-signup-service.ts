/**
 * Comprehensive User Signup Service
 * Implements end-to-end user signup with strict validation
 */

import { storage } from "../storage";
import { IStorage } from "../storage";
import { InsertUser, User } from "@shared/schema";
import bcrypt from "bcrypt";
import { db } from "../db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";

export interface SignupRequest {
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  userId?: string; // Optional user ID for validation
}

export interface SignupResponse {
  success: boolean;
  user?: User;
  error?: string;
  validationErrors?: { [key: string]: string };
}

export interface SubscriptionEligibility {
  eligible: boolean;
  userId: number;
  email: string;
  reason?: string;
  existingSubscription?: boolean;
}

export class UserSignupService {
  
  /**
   * Validate user signup request
   */
  async validateSignupRequest(request: SignupRequest): Promise<{ valid: boolean; errors: { [key: string]: string } }> {
    const errors: { [key: string]: string } = {};
    
    // Email validation
    if (!request.email || !request.email.includes('@')) {
      errors.email = 'Valid email address is required';
    } else {
      const existingUser = await storage.getUserByEmail(request.email);
      if (existingUser) {
        errors.email = 'Email address is already registered';
      }
    }
    
    // Phone validation
    if (!request.phone || request.phone.length < 10) {
      errors.phone = 'Valid phone number is required';
    } else {
      const existingUser = await storage.getUserByPhone(request.phone);
      if (existingUser) {
        errors.phone = 'Phone number is already registered';
      }
    }
    
    // Password validation
    if (!request.password || request.password.length < 8) {
      errors.password = 'Password must be at least 8 characters';
    }
    
    if (request.password !== request.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }
    
    return {
      valid: Object.keys(errors).length === 0,
      errors
    };
  }
  
  /**
   * Create new user account with validation
   */
  async createUser(request: SignupRequest): Promise<SignupResponse> {
    // Validate request
    const validation = await this.validateSignupRequest(request);
    if (!validation.valid) {
      return {
        success: false,
        error: 'Validation failed',
        validationErrors: validation.errors
      };
    }
    
    try {
      // Hash password
      const hashedPassword = await bcrypt.hash(request.password, 10);
      
      // Create user record
      const newUser: InsertUser = {
        userId: request.phone, // Use phone as UID
        email: request.email,
        password: hashedPassword,
        phone: request.phone,
        subscriptionPlan: null,
        subscriptionActive: false,
        remainingPosts: 0,
        totalPosts: 0,
        subscriptionSource: 'none'
      };
      
      const user = await storage.createUser(newUser);
      
      return {
        success: true,
        user
      };
    } catch (error) {
      console.error('User creation error:', error);
      return {
        success: false,
        error: 'Failed to create user account'
      };
    }
  }
  
  /**
   * Check if user is eligible for subscription
   * CRITICAL: Require valid user ID before any subscription/payment
   */
  async checkSubscriptionEligibility(userIdOrEmail: string): Promise<SubscriptionEligibility> {
    try {
      // Try to find user by ID first, then email
      let user: User | undefined;
      
      if (userIdOrEmail.includes('@')) {
        user = await storage.getUserByEmail(userIdOrEmail);
      } else {
        const userId = parseInt(userIdOrEmail);
        if (!isNaN(userId)) {
          user = await storage.getUser(userId);
        }
      }
      
      if (!user) {
        return {
          eligible: false,
          userId: 0,
          email: '',
          reason: 'User not found. Please sign up first.'
        };
      }
      
      // Check for existing active subscription
      const hasActiveSubscription = await storage.validateActiveSubscription(user.id);
      
      if (hasActiveSubscription) {
        return {
          eligible: false,
          userId: user.id,
          email: user.email,
          reason: 'User already has an active subscription',
          existingSubscription: true
        };
      }
      
      return {
        eligible: true,
        userId: user.id,
        email: user.email
      };
    } catch (error) {
      console.error('Subscription eligibility check error:', error);
      return {
        eligible: false,
        userId: 0,
        email: '',
        reason: 'Error checking subscription eligibility'
      };
    }
  }
  
  /**
   * Link user to Stripe subscription after successful payment
   */
  async linkSubscriptionToUser(userId: number, stripeCustomerId: string, stripeSubscriptionId: string, planType: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Validate user exists
      const user = await storage.getUser(userId);
      if (!user) {
        return {
          success: false,
          error: 'User not found'
        };
      }
      
      // Check for duplicate subscription
      const isDuplicate = await storage.checkDuplicateSubscription(user.email, stripeCustomerId);
      if (isDuplicate) {
        return {
          success: false,
          error: 'Duplicate subscription detected'
        };
      }
      
      // Link subscription
      const updatedUser = await storage.linkStripeSubscription(userId, stripeCustomerId, stripeSubscriptionId);
      
      // Set up 30-day quota cycle
      let quotaAmount = 0;
      switch (planType) {
        case 'starter':
          quotaAmount = 12;
          break;
        case 'growth':
          quotaAmount = 27;
          break;
        case 'professional':
          quotaAmount = 52;
          break;
        default:
          quotaAmount = 12;
      }
      
      await storage.set30DayQuotaCycle(userId, quotaAmount);
      
      return { success: true };
    } catch (error) {
      console.error('Subscription linking error:', error);
      return {
        success: false,
        error: 'Failed to link subscription'
      };
    }
  }
  
  /**
   * Authenticate user login
   */
  async authenticateUser(email: string, password: string): Promise<{ success: boolean; user?: User; error?: string }> {
    try {
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return {
          success: false,
          error: 'Invalid email or password'
        };
      }
      
      const passwordMatch = await bcrypt.compare(password, user.password);
      if (!passwordMatch) {
        return {
          success: false,
          error: 'Invalid email or password'
        };
      }
      
      return {
        success: true,
        user
      };
    } catch (error) {
      console.error('Authentication error:', error);
      return {
        success: false,
        error: 'Authentication failed'
      };
    }
  }
  
  /**
   * Reset user's 30-day quota cycle
   */
  async resetQuotaCycle(userId: number): Promise<{ success: boolean; error?: string }> {
    try {
      const user = await storage.getUser(userId);
      if (!user) {
        return {
          success: false,
          error: 'User not found'
        };
      }
      
      await storage.resetMonthlyQuota(userId);
      
      return { success: true };
    } catch (error) {
      console.error('Quota reset error:', error);
      return {
        success: false,
        error: 'Failed to reset quota cycle'
      };
    }
  }
}

export const userSignupService = new UserSignupService();