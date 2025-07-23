/**
 * Notification Service with Twilio and SendGrid Integration
 * Handles SMS and email notifications with validation and error handling
 */

import { MailService } from '@sendgrid/mail';
import twilio from 'twilio';

interface SMSOptions {
  to: string;
  message: string;
  from?: string;
}

interface EmailOptions {
  to: string;
  subject: string;
  text?: string;
  html?: string;
  from?: string;
}

interface ValidationResult {
  success: boolean;
  message?: string;
  code?: string;
}

export class NotificationService {
  private mailService: MailService;
  private twilioClient: any;
  private twilioVerifyService: string | undefined;
  private defaultFromEmail: string;
  private defaultFromPhone: string;

  constructor() {
    // Initialize SendGrid
    this.mailService = new MailService();
    if (process.env.SENDGRID_API_KEY) {
      this.mailService.setApiKey(process.env.SENDGRID_API_KEY);
      console.log('✅ SendGrid initialized');
    } else {
      console.warn('⚠️ SendGrid API key not found');
    }

    // Initialize Twilio
    if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
      this.twilioClient = twilio(
        process.env.TWILIO_ACCOUNT_SID,
        process.env.TWILIO_AUTH_TOKEN
      );
      this.twilioVerifyService = process.env.TWILIO_VERIFY_SERVICE_SID;
      console.log('✅ Twilio initialized');
    } else {
      console.warn('⚠️ Twilio credentials not found');
    }

    this.defaultFromEmail = process.env.SENDGRID_FROM_EMAIL || 'noreply@theagencyiq.ai';
    this.defaultFromPhone = process.env.TWILIO_PHONE_NUMBER || '+1234567890';
  }

  /**
   * Send SMS via Twilio
   */
  async sendSMS(options: SMSOptions): Promise<ValidationResult> {
    if (!this.twilioClient) {
      return {
        success: false,
        message: 'Twilio not configured'
      };
    }

    try {
      const message = await this.twilioClient.messages.create({
        body: options.message,
        from: options.from || this.defaultFromPhone,
        to: options.to
      });

      console.log(`📱 SMS sent successfully: ${message.sid}`);
      return {
        success: true,
        message: 'SMS sent successfully',
        code: message.sid
      };
    } catch (error) {
      console.error('❌ SMS sending failed:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'SMS sending failed'
      };
    }
  }

  /**
   * Send OTP via Twilio Verify
   */
  async sendOTP(phoneNumber: string): Promise<ValidationResult> {
    if (!this.twilioClient || !this.twilioVerifyService) {
      // Fallback to SMS
      return this.sendSMS({
        to: phoneNumber,
        message: `Your TheAgencyIQ verification code is: ${Math.floor(100000 + Math.random() * 900000)}`
      });
    }

    try {
      const verification = await this.twilioClient.verify.v2
        .services(this.twilioVerifyService)
        .verifications
        .create({
          to: phoneNumber,
          channel: 'sms'
        });

      console.log(`📱 OTP sent via Verify: ${verification.sid}`);
      return {
        success: true,
        message: 'OTP sent successfully',
        code: verification.sid
      };
    } catch (error) {
      console.error('❌ OTP sending failed:', error);
      // Fallback to regular SMS
      return this.sendSMS({
        to: phoneNumber,
        message: `Your TheAgencyIQ verification code is: ${Math.floor(100000 + Math.random() * 900000)}`
      });
    }
  }

  /**
   * Verify OTP via Twilio Verify
   */
  async verifyOTP(phoneNumber: string, code: string): Promise<ValidationResult> {
    if (!this.twilioClient || !this.twilioVerifyService) {
      return {
        success: false,
        message: 'Twilio Verify not configured'
      };
    }

    try {
      const verificationCheck = await this.twilioClient.verify.v2
        .services(this.twilioVerifyService)
        .verificationChecks
        .create({
          to: phoneNumber,
          code: code
        });

      const success = verificationCheck.status === 'approved';
      console.log(`📱 OTP verification: ${success ? 'SUCCESS' : 'FAILED'}`);
      
      return {
        success,
        message: success ? 'OTP verified successfully' : 'Invalid OTP code'
      };
    } catch (error) {
      console.error('❌ OTP verification failed:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'OTP verification failed'
      };
    }
  }

  /**
   * Send email via SendGrid
   */
  async sendEmail(options: EmailOptions): Promise<ValidationResult> {
    if (!process.env.SENDGRID_API_KEY) {
      return {
        success: false,
        message: 'SendGrid not configured'
      };
    }

    try {
      const [response] = await this.mailService.send({
        to: options.to,
        from: options.from || this.defaultFromEmail,
        subject: options.subject,
        text: options.text,
        html: options.html
      });

      console.log(`📧 Email sent successfully: ${response.headers['x-message-id']}`);
      return {
        success: true,
        message: 'Email sent successfully',
        code: response.headers['x-message-id'] as string
      };
    } catch (error) {
      console.error('❌ Email sending failed:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Email sending failed'
      };
    }
  }

  /**
   * Send email verification
   */
  async sendEmailVerification(email: string, verificationUrl: string): Promise<ValidationResult> {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Verify Your Email - TheAgencyIQ</title>
      </head>
      <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #2563eb;">TheAgencyIQ</h1>
          <h2 style="color: #374151;">Verify Your Email Address</h2>
        </div>
        
        <div style="background: #f9fafb; padding: 30px; border-radius: 8px; margin-bottom: 30px;">
          <p style="font-size: 16px; line-height: 1.6; color: #374151; margin-bottom: 20px;">
            Welcome to TheAgencyIQ! Please verify your email address to complete your account setup.
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verificationUrl}" 
               style="display: inline-block; background: #2563eb; color: white; padding: 15px 30px; 
                      text-decoration: none; border-radius: 6px; font-weight: 600;">
              Verify Email Address
            </a>
          </div>
          
          <p style="font-size: 14px; color: #6b7280; margin-top: 20px;">
            If the button doesn't work, copy and paste this URL into your browser:
            <br><br>
            <span style="word-break: break-all;">${verificationUrl}</span>
          </p>
        </div>
        
        <div style="text-align: center; font-size: 12px; color: #9ca3af;">
          <p>This verification link will expire in 24 hours.</p>
          <p>&copy; 2025 TheAgencyIQ. All rights reserved.</p>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to: email,
      subject: 'Verify Your Email - TheAgencyIQ',
      html,
      text: `Welcome to TheAgencyIQ! Please verify your email by visiting: ${verificationUrl}`
    });
  }

  /**
   * Send post publication notification
   */
  async sendPostNotification(
    email: string, 
    platform: string, 
    postTitle: string, 
    success: boolean
  ): Promise<ValidationResult> {
    const subject = success 
      ? `Post Published Successfully on ${platform}`
      : `Post Publication Failed on ${platform}`;

    const html = `
      <!DOCTYPE html>
      <html>
      <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #2563eb;">TheAgencyIQ</h1>
        <h2>${subject}</h2>
        
        <div style="background: ${success ? '#f0f9ff' : '#fef2f2'}; padding: 20px; border-radius: 8px;">
          <p><strong>Post:</strong> ${postTitle}</p>
          <p><strong>Platform:</strong> ${platform}</p>
          <p><strong>Status:</strong> ${success ? '✅ Published' : '❌ Failed'}</p>
          <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
        </div>
        
        ${success ? 
          '<p>Your post has been successfully published and is now live!</p>' :
          '<p>There was an issue publishing your post. Please check your platform connections.</p>'
        }
      </body>
      </html>
    `;

    return this.sendEmail({
      to: email,
      subject,
      html,
      text: `${subject}\n\nPost: ${postTitle}\nPlatform: ${platform}\nStatus: ${success ? 'Published' : 'Failed'}\nTime: ${new Date().toLocaleString()}`
    });
  }

  /**
   * Check service status
   */
  getServiceStatus() {
    return {
      sendgrid: {
        configured: !!process.env.SENDGRID_API_KEY,
        fromEmail: this.defaultFromEmail
      },
      twilio: {
        configured: !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN),
        verifyService: !!this.twilioVerifyService,
        fromPhone: this.defaultFromPhone
      }
    };
  }
}

export const notificationService = new NotificationService();