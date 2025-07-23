import { db } from '../db';
import { users, verificationCodes } from '@shared/schema';
import { eq } from 'drizzle-orm';
import sgMail from '@sendgrid/mail';
import twilio from 'twilio';
import crypto from 'crypto';

export class CustomerOnboardingService {
  private twilioClient?: any;

  constructor() {
    // Initialize SendGrid
    if (process.env.SENDGRID_API_KEY) {
      sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    }

    // Initialize Twilio
    if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
      this.twilioClient = twilio(
        process.env.TWILIO_ACCOUNT_SID,
        process.env.TWILIO_AUTH_TOKEN
      );
    }
  }

  // FIXED: Real Twilio Verify.create for phone OTP
  async sendPhoneOTP(phoneNumber: string): Promise<{ success: boolean; verificationSid?: string; error?: string }> {
    try {
      if (!this.twilioClient) {
        return {
          success: false,
          error: 'Twilio not configured - add TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN'
        };
      }

      // Use Twilio Verify service for OTP
      const verification = await this.twilioClient.verify.v2
        .services(process.env.TWILIO_VERIFY_SERVICE_SID)
        .verifications
        .create({
          to: phoneNumber,
          channel: 'sms'
        });

      console.log(`📱 OTP sent to ${phoneNumber}: ${verification.sid}`);

      return {
        success: true,
        verificationSid: verification.sid
      };

    } catch (error: any) {
      console.error('❌ Twilio OTP send failed:', error);
      return {
        success: false,
        error: error.message || 'Failed to send OTP'
      };
    }
  }

  // FIXED: Real Twilio Verify check for OTP validation
  async verifyPhoneOTP(phoneNumber: string, code: string): Promise<{ success: boolean; verified?: boolean; error?: string }> {
    try {
      if (!this.twilioClient) {
        return {
          success: false,
          error: 'Twilio not configured'
        };
      }

      // Verify OTP code with Twilio Verify
      const verificationCheck = await this.twilioClient.verify.v2
        .services(process.env.TWILIO_VERIFY_SERVICE_SID)
        .verificationChecks
        .create({
          to: phoneNumber,
          code: code
        });

      const isVerified = verificationCheck.status === 'approved';
      
      console.log(`🔍 Phone verification ${phoneNumber}: ${isVerified ? 'SUCCESS' : 'FAILED'}`);

      return {
        success: true,
        verified: isVerified
      };

    } catch (error: any) {
      console.error('❌ Twilio OTP verify failed:', error);
      return {
        success: false,
        error: error.message || 'Failed to verify OTP'
      };
    }
  }

  // FIXED: Real SendGrid sg.mail.send for email confirmation
  async sendEmailVerification(email: string, firstName: string): Promise<{ success: boolean; verificationToken?: string; error?: string }> {
    try {
      if (!process.env.SENDGRID_API_KEY) {
        return {
          success: false,
          error: 'SendGrid not configured - add SENDGRID_API_KEY'
        };
      }

      // Generate verification token
      const verificationToken = crypto.randomBytes(32).toString('hex');
      const verifyUrl = `${process.env.BASE_URL || 'https://4fc77172-459a-4da7-8c33-5014abb1b73e-00-dqhtnud4ismj.worf.replit.dev'}/verify-email?token=${verificationToken}`;

      // HTML email template
      const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">Welcome to TheAgencyIQ!</h2>
          <p>Hi ${firstName},</p>
          <p>Thanks for joining TheAgencyIQ, Queensland's premier AI-powered social media automation platform.</p>
          <p>Please verify your email address by clicking the button below:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verifyUrl}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              Verify Email Address
            </a>
          </div>
          <p>If the button doesn't work, copy and paste this link:</p>
          <p style="word-break: break-all; color: #6b7280;">${verifyUrl}</p>
          <p>This verification link expires in 24 hours.</p>
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; font-size: 14px;">
            TheAgencyIQ - AI-Powered Social Media Automation for Queensland SMEs<br>
            If you didn't create this account, please ignore this email.
          </p>
        </div>
      `;

      // Send email with SendGrid
      await sgMail.send({
        to: email,
        from: process.env.SENDGRID_FROM_EMAIL || 'noreply@theagencyiq.ai',
        subject: 'Verify your TheAgencyIQ account',
        html: htmlContent
      });

      // Store verification token in database
      await db.insert(verificationCodes).values({
        phone: email, // Using phone field for email verification
        code: verificationToken,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        verified: false
      });

      console.log(`📧 Email verification sent to ${email}`);

      return {
        success: true,
        verificationToken
      };

    } catch (error: any) {
      console.error('❌ SendGrid email send failed:', error);
      return {
        success: false,
        error: error.message || 'Failed to send verification email'
      };
    }
  }

  // FIXED: Real Drizzle insert(users).values(validData) on validation success
  async completeOnboarding(userData: {
    firstName: string;
    lastName: string;
    email: string;
    phoneNumber: string;
    businessName: string;
    businessType: string;
    industry: string;
    subscriptionPlan: string;
  }): Promise<{ success: boolean; userId?: string; error?: string }> {
    try {
      // Generate secure user ID
      const userId = crypto.randomBytes(16).toString('hex');

      // Insert user into database with Drizzle
      const [newUser] = await db.insert(users).values({
        id: userId,
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        businessName: userData.businessName,
        businessType: userData.businessType,
        industry: userData.industry,
        location: 'Queensland, Australia',
        subscriptionPlan: userData.subscriptionPlan,
        subscriptionActive: true,
        subscriptionStart: new Date(),
        remainingPosts: this.getPostQuota(userData.subscriptionPlan),
        totalPosts: 0,
        onboardingCompleted: true,
        onboardingStep: 'complete',
        createdAt: new Date(),
        updatedAt: new Date()
      }).returning();

      console.log(`✅ User onboarding completed: ${userId} (${userData.email})`);

      // Sync with subscribers.json for backward compatibility
      await this.syncToSubscribersJson(newUser);

      // Send welcome email
      await this.sendWelcomeEmail(userData.email, userData.firstName);

      return {
        success: true,
        userId: newUser.id
      };

    } catch (error: any) {
      console.error('❌ Onboarding completion failed:', error);
      return {
        success: false,
        error: error.message || 'Failed to complete onboarding'
      };
    }
  }

  // FIXED: Integration with subscribers.json for new user
  private async syncToSubscribersJson(user: any): Promise<void> {
    try {
      const fs = require('fs').promises;
      let subscribers = [];

      try {
        const data = await fs.readFile('subscribers.json', 'utf8');
        subscribers = JSON.parse(data);
      } catch (error) {
        // File doesn't exist, start with empty array
        subscribers = [];
      }

      // Add new subscriber
      subscribers.push({
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        businessName: user.businessName,
        subscriptionPlan: user.subscriptionPlan,
        joinedAt: user.createdAt,
        source: 'onboarding'
      });

      // Write back to file
      await fs.writeFile('subscribers.json', JSON.stringify(subscribers, null, 2));
      console.log(`📝 User synced to subscribers.json: ${user.email}`);

    } catch (error) {
      console.error('❌ Failed to sync to subscribers.json:', error);
    }
  }

  private async sendWelcomeEmail(email: string, firstName: string): Promise<void> {
    try {
      if (!process.env.SENDGRID_API_KEY) return;

      const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">Welcome to TheAgencyIQ, ${firstName}!</h2>
          <p>Your account has been successfully created and verified.</p>
          <p>You can now start creating AI-powered social media content for your Queensland business.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.BASE_URL}/dashboard" style="background-color: #16a34a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              Access Dashboard
            </a>
          </div>
          <p>Need help getting started? Our support team is ready to assist you.</p>
        </div>
      `;

      await sgMail.send({
        to: email,
        from: process.env.SENDGRID_FROM_EMAIL || 'noreply@theagencyiq.ai',
        subject: 'Welcome to TheAgencyIQ - Your Account is Ready!',
        html: htmlContent
      });

    } catch (error) {
      console.error('❌ Failed to send welcome email:', error);
    }
  }

  // FIXED: Guest mode if auth fails
  async enableGuestMode(): Promise<{ success: boolean; guestToken: string; limitations: string[] }> {
    const guestToken = crypto.randomBytes(16).toString('hex');
    
    return {
      success: true,
      guestToken,
      limitations: [
        'Limited to 3 posts per session',
        'No platform connections',
        'No video generation',
        'No analytics access',
        'Session expires in 2 hours'
      ]
    };
  }

  // FIXED: Email verification token verification
  async verifyEmailToken(token: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Find verification token in database
      const [verification] = await db
        .select()
        .from(verificationCodes)
        .where(eq(verificationCodes.code, token));

      if (!verification) {
        return { success: false, error: 'Invalid verification token' };
      }

      if (verification.verified) {
        return { success: false, error: 'Token already used' };
      }

      if (new Date() > verification.expiresAt) {
        return { success: false, error: 'Token has expired' };
      }

      // Mark as verified
      await db
        .update(verificationCodes)
        .set({ verified: true })
        .where(eq(verificationCodes.id, verification.id));

      console.log(`✅ Email verification completed for token: ${token}`);
      return { success: true };

    } catch (error: any) {
      console.error('❌ Email token verification failed:', error);
      return { success: false, error: error.message };
    }
  }

  private getPostQuota(plan: string): number {
    switch (plan) {
      case 'starter': return 12;
      case 'growth': return 27;
      case 'professional': return 52;
      default: return 12;
    }
  }

  // Validation methods
  async validateUserData(data: any): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    // Email validation
    if (!data.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      errors.push('Valid email address is required');
    }

    // Phone validation (Australian format)
    if (!data.phoneNumber || !/^(\+61|0)[2-9]\d{8}$/.test(data.phoneNumber.replace(/\s/g, ''))) {
      errors.push('Valid Australian phone number is required');
    }

    // Name validation
    if (!data.firstName || data.firstName.length < 2) {
      errors.push('First name must be at least 2 characters');
    }

    if (!data.lastName || data.lastName.length < 2) {
      errors.push('Last name must be at least 2 characters');
    }

    // Business validation
    if (!data.businessName || data.businessName.length < 2) {
      errors.push('Business name is required');
    }

    if (!data.industry || data.industry.length < 2) {
      errors.push('Industry is required');
    }

    // Check for duplicate email
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.email, data.email))
      .limit(1);

    if (existingUser.length > 0) {
      errors.push('Email address is already registered');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}