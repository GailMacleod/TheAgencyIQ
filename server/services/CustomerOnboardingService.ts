import { db } from '../db';
import { users, type InsertUser } from '@shared/schema';
import { eq } from 'drizzle-orm';
import sgMail from '@sendgrid/mail';
import twilio from 'twilio';
import type { Request, Response } from 'express';
import crypto from 'crypto';

interface OnboardingData {
  email: string;
  phone: string;
  firstName?: string;
  lastName?: string;
  businessName?: string;
  subscriptionPlan?: string;
}

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  data?: OnboardingData;
  verificationToken?: string;
  otpCode?: string;
}

interface VerificationStatus {
  phoneVerified: boolean;
  emailVerified: boolean;
  readyForRegistration: boolean;
  errors: string[];
}

export class CustomerOnboardingService {
  private twilioClient: ReturnType<typeof twilio> | null = null;
  private verificationCodes: Map<string, { code: string; expires: Date; attempts: number }> = new Map();

  constructor() {
    // Initialize Twilio if credentials available
    if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
      this.twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    }

    // Initialize SendGrid if API key available
    if (process.env.SENDGRID_API_KEY) {
      sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    }

    // Cleanup expired verification codes every 5 minutes
    setInterval(() => {
      this.cleanupExpiredCodes();
    }, 5 * 60 * 1000);
  }

  /**
   * Validate onboarding data with comprehensive edge case checking
   */
  async validateOnboardingData(data: any): Promise<ValidationResult> {
    const errors: string[] = [];
    const validData: Partial<OnboardingData> = {};

    // Email validation with comprehensive edge cases
    if (!data.email) {
      errors.push('Email is required');
    } else if (typeof data.email !== 'string') {
      errors.push('Email must be a string');
    } else {
      const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
      const email = data.email.trim().toLowerCase();
      
      if (!emailRegex.test(email)) {
        errors.push('Invalid email format');
      } else if (email.length > 254) {
        errors.push('Email too long (max 254 characters)');
      } else if (email.includes('..')) {
        errors.push('Email cannot contain consecutive dots');
      } else if (email.startsWith('.') || email.endsWith('.')) {
        errors.push('Email cannot start or end with a dot');
      } else {
        // Check if email already exists
        const existingUser = await db.select().from(users).where(eq(users.email, email)).limit(1);
        if (existingUser.length > 0) {
          errors.push('Email already registered');
        } else {
          validData.email = email;
        }
      }
    }

    // Phone validation with comprehensive edge cases
    if (!data.phone) {
      errors.push('Phone number is required');
    } else if (typeof data.phone !== 'string') {
      errors.push('Phone must be a string');
    } else {
      const phone = data.phone.trim();
      
      // Remove all non-digit characters except + at start
      const cleanPhone = phone.replace(/[^\d+]/g, '');
      
      // Australian phone number validation
      const auPhoneRegex = /^(\+61|0)[2-9]\d{8}$/;
      const intlPhoneRegex = /^\+[1-9]\d{6,14}$/;
      
      if (!auPhoneRegex.test(cleanPhone) && !intlPhoneRegex.test(cleanPhone)) {
        errors.push('Invalid phone format. Use Australian format (+61XXXXXXXXX or 0XXXXXXXXX) or international format (+XXXXXXXXXXXX)');
      } else if (cleanPhone.length < 8 || cleanPhone.length > 16) {
        errors.push('Phone number length invalid (8-16 digits)');
      } else {
        // Normalize phone format
        let normalizedPhone = cleanPhone;
        if (normalizedPhone.startsWith('0')) {
          normalizedPhone = '+61' + normalizedPhone.substring(1);
        }
        
        // Note: Phone validation would check existing users if phone field exists in schema
        validData.phone = normalizedPhone;
      }
    }

    // First name validation
    if (data.firstName) {
      if (typeof data.firstName !== 'string') {
        errors.push('First name must be a string');
      } else {
        const firstName = data.firstName.trim();
        if (firstName.length < 1) {
          errors.push('First name cannot be empty');
        } else if (firstName.length > 50) {
          errors.push('First name too long (max 50 characters)');
        } else if (!/^[a-zA-Z\s\-']+$/.test(firstName)) {
          errors.push('First name contains invalid characters');
        } else {
          validData.firstName = firstName;
        }
      }
    }

    // Last name validation
    if (data.lastName) {
      if (typeof data.lastName !== 'string') {
        errors.push('Last name must be a string');
      } else {
        const lastName = data.lastName.trim();
        if (lastName.length < 1) {
          errors.push('Last name cannot be empty');
        } else if (lastName.length > 50) {
          errors.push('Last name too long (max 50 characters)');
        } else if (!/^[a-zA-Z\s\-']+$/.test(lastName)) {
          errors.push('Last name contains invalid characters');
        } else {
          validData.lastName = lastName;
        }
      }
    }

    // Business name validation
    if (data.businessName) {
      if (typeof data.businessName !== 'string') {
        errors.push('Business name must be a string');
      } else {
        const businessName = data.businessName.trim();
        if (businessName.length < 1) {
          errors.push('Business name cannot be empty');
        } else if (businessName.length > 100) {
          errors.push('Business name too long (max 100 characters)');
        } else if (!/^[a-zA-Z0-9\s&.,\-'()]+$/.test(businessName)) {
          errors.push('Business name contains invalid characters');
        } else {
          validData.businessName = businessName;
        }
      }
    }

    // Subscription plan validation
    if (data.subscriptionPlan) {
      const validPlans = ['free', 'growth', 'professional', 'enterprise'];
      if (!validPlans.includes(data.subscriptionPlan)) {
        errors.push('Invalid subscription plan');
      } else {
        validData.subscriptionPlan = data.subscriptionPlan;
      }
    }

    const result: ValidationResult = {
      isValid: errors.length === 0,
      errors,
      data: errors.length === 0 ? validData as OnboardingData : undefined
    };

    // If validation passes, generate verification codes
    if (result.isValid && result.data) {
      result.verificationToken = this.generateVerificationToken();
      result.otpCode = this.generateOTPCode();
    }

    return result;
  }

  /**
   * Send phone OTP via Twilio Verify
   */
  async sendPhoneOTP(phone: string): Promise<{ success: boolean; error?: string; sid?: string }> {
    try {
      if (!this.twilioClient) {
        return { 
          success: false, 
          error: 'Twilio not configured. Please configure TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN' 
        };
      }

      // Generate 6-digit OTP
      const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
      const expires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      // Store OTP code
      this.verificationCodes.set(phone, {
        code: otpCode,
        expires,
        attempts: 0
      });

      // Send OTP via Twilio
      let verification;
      
      // Try Twilio Verify service first
      if (process.env.TWILIO_VERIFY_SERVICE_SID) {
        verification = await this.twilioClient.verify.v2
          .services(process.env.TWILIO_VERIFY_SERVICE_SID)
          .verifications
          .create({ to: phone, channel: 'sms' });
      } else {
        // Fallback to direct SMS
        verification = await this.twilioClient.messages.create({
          body: `Your TheAgencyIQ verification code is: ${otpCode}. Valid for 10 minutes.`,
          from: process.env.TWILIO_PHONE_NUMBER || '+61412345678',
          to: phone
        });
      }

      console.log(`✅ Phone OTP sent to ${phone}: ${verification.sid || verification.messagingServiceSid}`);

      return {
        success: true,
        sid: verification.sid || verification.messagingServiceSid
      };

    } catch (error: any) {
      console.error('Twilio OTP error:', error);
      return {
        success: false,
        error: `Failed to send OTP: ${error.message}`
      };
    }
  }

  /**
   * Verify phone OTP
   */
  async verifyPhoneOTP(phone: string, code: string): Promise<{ success: boolean; error?: string }> {
    try {
      const stored = this.verificationCodes.get(phone);
      
      if (!stored) {
        return { success: false, error: 'No verification code found for this phone number' };
      }

      if (new Date() > stored.expires) {
        this.verificationCodes.delete(phone);
        return { success: false, error: 'Verification code expired' };
      }

      if (stored.attempts >= 3) {
        this.verificationCodes.delete(phone);
        return { success: false, error: 'Too many attempts. Please request a new code' };
      }

      // Increment attempts
      stored.attempts++;

      // Check code
      if (stored.code !== code.trim()) {
        return { success: false, error: 'Invalid verification code' };
      }

      // Remove verification code after successful verification
      this.verificationCodes.delete(phone);

      console.log(`✅ Phone verification successful for ${phone}`);
      return { success: true };

    } catch (error: any) {
      console.error('Phone OTP verification error:', error);
      return { success: false, error: 'Verification failed' };
    }
  }

  /**
   * Send email verification via SendGrid
   */
  async sendEmailVerification(email: string, verificationToken: string): Promise<{ success: boolean; error?: string }> {
    try {
      if (!process.env.SENDGRID_API_KEY) {
        return { 
          success: false, 
          error: 'SendGrid not configured. Please configure SENDGRID_API_KEY' 
        };
      }

      const verificationUrl = `${process.env.BASE_URL || 'http://localhost:5000'}/api/verify-email?token=${verificationToken}&email=${encodeURIComponent(email)}`;

      const msg = {
        to: email,
        from: process.env.FROM_EMAIL || 'noreply@theagencyiq.com',
        subject: 'Verify your TheAgencyIQ account',
        text: `Welcome to TheAgencyIQ! Please verify your email by clicking: ${verificationUrl}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2563eb;">Welcome to TheAgencyIQ!</h2>
            <p>Thank you for signing up. Please verify your email address to complete your registration.</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${verificationUrl}" 
                 style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
                Verify Email Address
              </a>
            </div>
            <p style="color: #666; font-size: 12px;">
              If the button doesn't work, copy and paste this link: ${verificationUrl}
            </p>
            <p style="color: #666; font-size: 12px;">
              This verification link expires in 24 hours.
            </p>
          </div>
        `
      };

      await sgMail.send(msg);

      console.log(`✅ Email verification sent to ${email}`);
      return { success: true };

    } catch (error: any) {
      console.error('SendGrid email error:', error);
      return {
        success: false,
        error: `Failed to send email: ${error.message}`
      };
    }
  }

  /**
   * Complete user registration with Drizzle database insert
   */
  async completeRegistration(validatedData: OnboardingData, verificationStatus: VerificationStatus): Promise<{ success: boolean; user?: any; error?: string }> {
    try {
      if (!verificationStatus.readyForRegistration) {
        return {
          success: false,
          error: 'Verification not complete. Please verify phone and email first.'
        };
      }

      // Prepare user data for database insertion (using existing schema fields)
      const userData: InsertUser = {
        id: `user_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`,
        email: validatedData.email,
        firstName: validatedData.firstName || null,
        lastName: validatedData.lastName || null,
        subscriptionPlan: validatedData.subscriptionPlan || 'free'
      };

      // Insert user into database using Drizzle
      const [newUser] = await db.insert(users).values(userData).returning();

      console.log(`✅ User registration completed for ${validatedData.email}: ID ${newUser.id}`);

      return {
        success: true,
        user: {
          id: newUser.id,
          email: newUser.email,
          firstName: newUser.firstName,
          lastName: newUser.lastName,
          subscriptionPlan: newUser.subscriptionPlan
        }
      };

    } catch (error: any) {
      console.error('Registration completion error:', error);
      return {
        success: false,
        error: `Registration failed: ${error.message}`
      };
    }
  }

  /**
   * Enable guest mode access with limited functionality
   */
  async enableGuestMode(): Promise<{ success: boolean; guestSession?: any; error?: string }> {
    try {
      // Generate guest session with limited access
      const guestId = `guest_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
      
      const guestSession = {
        guestId,
        isGuest: true,
        accessLevel: 'limited',
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        features: {
          platformConnections: false,
          videoGeneration: false,
          autoPosting: false,
          analytics: false,
          preview: true,
          documentation: true
        },
        limitations: [
          'No platform connections',
          'No video generation',
          'No auto-posting',
          'Preview mode only',
          'Limited to 24 hours'
        ]
      };

      console.log(`✅ Guest mode enabled: ${guestId}`);

      return {
        success: true,
        guestSession
      };

    } catch (error: any) {
      console.error('Guest mode error:', error);
      return {
        success: false,
        error: `Guest mode failed: ${error.message}`
      };
    }
  }

  /**
   * Get verification status for a user
   */
  getVerificationStatus(phoneVerified: boolean, emailVerified: boolean): VerificationStatus {
    return {
      phoneVerified,
      emailVerified,
      readyForRegistration: phoneVerified && emailVerified,
      errors: [
        ...(!phoneVerified ? ['Phone verification required'] : []),
        ...(!emailVerified ? ['Email verification required'] : [])
      ]
    };
  }

  /**
   * Generate secure verification token
   */
  private generateVerificationToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Generate 6-digit OTP code
   */
  private generateOTPCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Cleanup expired verification codes
   */
  private cleanupExpiredCodes(): void {
    const now = new Date();
    const entries = Array.from(this.verificationCodes.entries());
    for (const [phone, data] of entries) {
      if (now > data.expires) {
        this.verificationCodes.delete(phone);
      }
    }
  }
}

export const customerOnboardingService = new CustomerOnboardingService();