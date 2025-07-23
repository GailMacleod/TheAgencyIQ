/**
 * CUSTOMER ONBOARDING AUTHENTICATION SECURITY
 * Comprehensive authentication middleware with proper Drizzle safe queries
 * Eliminates hardcoded user_id=2 and SQL injection vulnerabilities
 */

import { Request, Response, NextFunction } from 'express';
import { db } from '../db';
import { users, brandPurpose, oauthTokens, type User, type BrandPurpose, type OAuthToken } from '../../shared/schema';
import { eq, and } from 'drizzle-orm';

interface CustomRequest extends Request {
  session: any;
  user?: any;
  userId?: string;
  onboardingStatus?: OnboardingStatus;
}

export interface OnboardingStatus {
  isCompleted: boolean;
  hasProfile: boolean;
  hasBrandPurpose: boolean;
  hasOAuthConnections: boolean;
  platformsConnected: string[];
  completionPercentage: number;
  nextSteps: string[];
}

export class CustomerOnboardingAuth {
  
  /**
   * SECURITY FIX: Require authenticated session with real database validation
   * Eliminates hardcoded user_id=2 vulnerability
   */
  static requireAuth = async (req: CustomRequest, res: Response, next: NextFunction) => {
    try {
      // SECURITY: Check session exists and has valid userId
      if (!req.session || !req.session.userId) {
        console.log('❌ [AUTH] No valid session found');
        return res.status(401).json({
          success: false,
          message: 'Authentication required',
          code: 'NO_SESSION',
          redirect: '/api/login'
        });
      }

      const sessionUserId = req.session.userId;
      console.log(`🔐 [AUTH] Validating user session: ${sessionUserId}`);

      // DRIZZLE SAFE QUERY: Get user with parameterized query (prevents SQL injection)
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, sessionUserId))
        .limit(1);

      if (!user) {
        console.log(`❌ [AUTH] User not found in database: ${sessionUserId}`);
        // Clear invalid session
        req.session.destroy();
        return res.status(401).json({
          success: false,
          message: 'User account not found',
          code: 'USER_NOT_FOUND',
          redirect: '/api/login'
        });
      }

      // Attach authenticated user data to request
      req.user = user;
      req.userId = user.id;

      console.log(`✅ [AUTH] User authenticated: ${user.email} (ID: ${user.id})`);
      next();

    } catch (error: any) {
      console.error('❌ [AUTH] Authentication error:', error);
      return res.status(500).json({
        success: false,
        message: 'Authentication check failed',
        code: 'AUTH_ERROR'
      });
    }
  };

  /**
   * ONBOARDING STATUS CHECK: Verify customer has completed onboarding
   * Prevents posting without proper setup
   */
  static requireOnboardingComplete = async (req: CustomRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.userId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required for onboarding check'
        });
      }

      const onboardingStatus = await CustomerOnboardingAuth.getOnboardingStatus(req.userId);
      req.onboardingStatus = onboardingStatus;

      if (!onboardingStatus.isCompleted) {
        console.log(`⚠️ [ONBOARDING] User ${req.userId} has not completed onboarding (${onboardingStatus.completionPercentage}%)`);
        return res.status(403).json({
          success: false,
          message: 'Onboarding must be completed before posting',
          code: 'ONBOARDING_INCOMPLETE',
          onboardingStatus,
          nextSteps: onboardingStatus.nextSteps
        });
      }

      console.log(`✅ [ONBOARDING] User ${req.userId} onboarding complete`);
      next();

    } catch (error: any) {
      console.error('❌ [ONBOARDING] Error checking onboarding status:', error);
      return res.status(500).json({
        success: false,
        message: 'Onboarding status check failed'
      });
    }
  };

  /**
   * COMPREHENSIVE ONBOARDING STATUS CHECK
   * Uses Drizzle safe queries to validate customer setup
   */
  static async getOnboardingStatus(userId: string): Promise<OnboardingStatus> {
    try {
      console.log(`📋 [ONBOARDING] Checking status for user: ${userId}`);

      // DRIZZLE SAFE QUERY: Get user profile
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      const hasProfile = !!(user?.firstName && user?.lastName && user?.email);

      // DRIZZLE SAFE QUERY: Get brand purpose
      const [brandPurposeData] = await db
        .select()
        .from(brandPurpose)
        .where(eq(brandPurpose.userId, userId))
        .limit(1);

      const hasBrandPurpose = !!(brandPurposeData?.businessName && brandPurposeData?.jobToBeDone);

      // DRIZZLE SAFE QUERY: Get OAuth connections
      const oauthConnections = await db
        .select()
        .from(oauthTokens)
        .where(and(
          eq(oauthTokens.userId, userId),
          eq(oauthTokens.isValid, true)
        ));

      const platformsConnected = oauthConnections.map(token => token.platform);
      const hasOAuthConnections = platformsConnected.length > 0;

      // Calculate completion percentage
      let completionPercentage = 0;
      const steps = [hasProfile, hasBrandPurpose, hasOAuthConnections];
      completionPercentage = Math.round((steps.filter(Boolean).length / steps.length) * 100);

      // Determine next steps
      const nextSteps: string[] = [];
      if (!hasProfile) nextSteps.push('Complete user profile');
      if (!hasBrandPurpose) nextSteps.push('Set up brand purpose and business goals');
      if (!hasOAuthConnections) nextSteps.push('Connect at least one social media platform');

      const isCompleted = hasProfile && hasBrandPurpose && hasOAuthConnections;

      const status: OnboardingStatus = {
        isCompleted,
        hasProfile,
        hasBrandPurpose,
        hasOAuthConnections,
        platformsConnected,
        completionPercentage,
        nextSteps
      };

      console.log(`📊 [ONBOARDING] Status for user ${userId}:`, {
        completed: isCompleted,
        percentage: completionPercentage,
        platforms: platformsConnected.length
      });

      return status;

    } catch (error: any) {
      console.error('❌ [ONBOARDING] Error getting onboarding status:', error);
      throw error;
    }
  }

  /**
   * CREATE NEW USER WITH ONBOARDING TRACKING
   * Uses Drizzle safe insert queries
   */
  static async createUserWithOnboarding(userData: {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
    profileImageUrl?: string;
  }) {
    try {
      console.log(`👤 [ONBOARDING] Creating new user: ${userData.email}`);

      // DRIZZLE SAFE INSERT: Create user record
      const [newUser] = await db
        .insert(users)
        .values({
          id: userData.id,
          email: userData.email,
          firstName: userData.firstName || null,
          lastName: userData.lastName || null,
          profileImageUrl: userData.profileImageUrl || null,
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .onConflictDoUpdate({
          target: users.id,
          set: {
            email: userData.email,
            firstName: userData.firstName || null,
            lastName: userData.lastName || null,
            profileImageUrl: userData.profileImageUrl || null,
            updatedAt: new Date()
          }
        })
        .returning();

      console.log(`✅ [ONBOARDING] User created/updated: ${newUser.id}`);
      return newUser;

    } catch (error: any) {
      console.error('❌ [ONBOARDING] Error creating user:', error);
      throw error;
    }
  }

  /**
   * REQUIRE OAUTH SCOPE: Verify user has specific platform connection
   */
  static requireOAuthScope = (requiredPlatforms: string[]) => {
    return async (req: CustomRequest, res: Response, next: NextFunction) => {
      try {
        if (!req.userId) {
          return res.status(401).json({
            success: false,
            message: 'Authentication required for OAuth scope check'
          });
        }

        // DRIZZLE SAFE QUERY: Check OAuth tokens for required platforms
        const validTokens = await db
          .select()
          .from(oauthTokens)
          .where(and(
            eq(oauthTokens.userId, req.userId),
            eq(oauthTokens.isValid, true)
          ));

        const connectedPlatforms = validTokens.map(token => token.platform);
        const missingPlatforms = requiredPlatforms.filter(platform => 
          !connectedPlatforms.includes(platform)
        );

        if (missingPlatforms.length > 0) {
          return res.status(403).json({
            success: false,
            message: `Missing required platform connections: ${missingPlatforms.join(', ')}`,
            code: 'MISSING_OAUTH_SCOPE',
            missingPlatforms,
            connectedPlatforms
          });
        }

        next();

      } catch (error: any) {
        console.error('❌ [OAUTH] OAuth scope check error:', error);
        return res.status(500).json({
          success: false,
          message: 'OAuth scope check failed'
        });
      }
    };
  };

  /**
   * OPTIONAL AUTH: Allow both authenticated and anonymous users
   * But provide user context if authenticated
   */
  static optionalAuth = async (req: CustomRequest, res: Response, next: NextFunction) => {
    try {
      if (req.session?.userId) {
        // DRIZZLE SAFE QUERY: Get user if session exists
        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.id, req.session.userId))
          .limit(1);

        if (user) {
          req.user = user;
          req.userId = user.id;
          console.log(`🔐 [OPTIONAL_AUTH] User context: ${user.email}`);
        }
      }

      next();

    } catch (error: any) {
      console.error('❌ [OPTIONAL_AUTH] Error:', error);
      // Continue without user context on error
      next();
    }
  };

  /**
   * REQUIRE ACTIVE SUBSCRIPTION: Check user has valid subscription
   */
  static requireActiveSubscription = async (req: CustomRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.userId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required for subscription check'
        });
      }

      // DRIZZLE SAFE QUERY: Check user subscription status
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, req.userId))
        .limit(1);

      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'User not found'
        });
      }

      // For now, allow all authenticated users
      // TODO: Add subscription validation when subscription system is implemented
      console.log(`💳 [SUBSCRIPTION] User ${req.userId} subscription check passed`);
      next();

    } catch (error: any) {
      console.error('❌ [SUBSCRIPTION] Subscription check error:', error);
      return res.status(500).json({
        success: false,
        message: 'Subscription check failed'
      });
    }
  };
}

export default CustomerOnboardingAuth;