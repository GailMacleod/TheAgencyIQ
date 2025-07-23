/**
 * NOTIFICATION SERVICE
 * Handles SMS via Twilio and Email via SendGrid for post success/failure notifications
 */

import { MailService } from '@sendgrid/mail';
import twilio from 'twilio';
import { storage } from '../storage';

interface NotificationResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export class NotificationService {
  private mailService: MailService | null = null;
  private twilioClient: any = null;

  constructor() {
    // Initialize SendGrid
    if (process.env.SENDGRID_API_KEY) {
      this.mailService = new MailService();
      this.mailService.setApiKey(process.env.SENDGRID_API_KEY);
      console.log('✅ [NOTIFICATIONS] SendGrid initialized');
    } else {
      console.log('⚠️ [NOTIFICATIONS] SendGrid API key not found');
    }

    // Initialize Twilio
    if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
      this.twilioClient = twilio(
        process.env.TWILIO_ACCOUNT_SID,
        process.env.TWILIO_AUTH_TOKEN
      );
      console.log('✅ [NOTIFICATIONS] Twilio initialized');
    } else {
      console.log('⚠️ [NOTIFICATIONS] Twilio credentials not found');
    }
  }

  /**
   * Send success notification for published post
   */
  async sendSuccessNotification(
    userId: number,
    platform: string,
    postId: number,
    platformPostId: string,
    analytics?: any
  ): Promise<void> {
    try {
      const user = await storage.getUser(userId);
      if (!user || !user.email) {
        console.log(`⚠️ [NOTIFICATIONS] No email found for user ${userId}`);
        return;
      }

      // Format analytics data
      const analyticsText = analytics ? 
        `Analytics: ${JSON.stringify(analytics, null, 2)}` : 
        'Analytics will be available shortly.';

      // Send email notification
      if (this.mailService) {
        await this.sendSuccessEmail(
          user.email,
          platform,
          postId,
          platformPostId,
          analyticsText
        );
      }

      // Send SMS notification if phone number available
      if (this.twilioClient && user.phone) {
        await this.sendSuccessSMS(
          user.phone,
          platform,
          postId,
          platformPostId
        );
      }

      console.log(`✅ [NOTIFICATIONS] Success notifications sent for post ${postId} on ${platform}`);

    } catch (error: any) {
      console.error(`❌ [NOTIFICATIONS] Failed to send success notification:`, error);
    }
  }

  /**
   * Send failure notification for failed post
   */
  async sendFailureNotification(
    userId: number,
    platform: string,
    postId: number,
    error: string
  ): Promise<void> {
    try {
      const user = await storage.getUser(userId);
      if (!user || !user.email) {
        console.log(`⚠️ [NOTIFICATIONS] No email found for user ${userId}`);
        return;
      }

      // Send email notification
      if (this.mailService) {
        await this.sendFailureEmail(
          user.email,
          platform,
          postId,
          error
        );
      }

      // Send SMS notification if phone number available
      if (this.twilioClient && user.phone) {
        await this.sendFailureSMS(
          user.phone,
          platform,
          postId,
          error
        );
      }

      console.log(`📧 [NOTIFICATIONS] Failure notifications sent for post ${postId} on ${platform}`);

    } catch (error: any) {
      console.error(`❌ [NOTIFICATIONS] Failed to send failure notification:`, error);
    }
  }

  /**
   * Send success email via SendGrid
   */
  private async sendSuccessEmail(
    email: string,
    platform: string,
    postId: number,
    platformPostId: string,
    analytics: string
  ): Promise<NotificationResult> {
    try {
      const subject = `✅ Post Published Successfully on ${platform.charAt(0).toUpperCase() + platform.slice(1)}`;
      
      const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #28a745;">🎉 Post Published Successfully!</h2>
          
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Platform:</strong> ${platform.charAt(0).toUpperCase() + platform.slice(1)}</p>
            <p><strong>Post ID:</strong> ${postId}</p>
            <p><strong>Platform Post ID:</strong> ${platformPostId}</p>
            <p><strong>Published:</strong> ${new Date().toLocaleString('en-AU', { timeZone: 'Australia/Brisbane' })}</p>
          </div>

          <div style="background: #e3f2fd; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #1976d2;">📊 Analytics</h3>
            <pre style="background: white; padding: 10px; border-radius: 4px; overflow-x: auto;">${analytics}</pre>
          </div>

          <p style="color: #666;">Your content is now live and reaching your Queensland audience! 🇦🇺</p>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #888; font-size: 12px;">
            <p>TheAgencyIQ - Queensland Small Business Social Media Automation</p>
          </div>
        </div>
      `;

      const textContent = `
Post Published Successfully!

Platform: ${platform.charAt(0).toUpperCase() + platform.slice(1)}
Post ID: ${postId}
Platform Post ID: ${platformPostId}
Published: ${new Date().toLocaleString('en-AU', { timeZone: 'Australia/Brisbane' })}

Analytics:
${analytics}

Your content is now live and reaching your Queensland audience!

TheAgencyIQ - Queensland Small Business Social Media Automation
      `;

      const message = {
        to: email,
        from: process.env.SENDGRID_FROM_EMAIL || 'noreply@theagencyiq.com',
        subject,
        text: textContent,
        html: htmlContent
      };

      const response = await this.mailService.send(message);
      
      console.log(`✅ [EMAIL] Success notification sent to ${email}`);
      return {
        success: true,
        messageId: response[0].headers['x-message-id']
      };

    } catch (error: any) {
      console.error(`❌ [EMAIL] Failed to send success email:`, error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Send failure email via SendGrid
   */
  private async sendFailureEmail(
    email: string,
    platform: string,
    postId: number,
    error: string
  ): Promise<NotificationResult> {
    try {
      const subject = `❌ Post Publishing Failed on ${platform.charAt(0).toUpperCase() + platform.slice(1)}`;
      
      const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #dc3545;">⚠️ Post Publishing Failed</h2>
          
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Platform:</strong> ${platform.charAt(0).toUpperCase() + platform.slice(1)}</p>
            <p><strong>Post ID:</strong> ${postId}</p>
            <p><strong>Failed At:</strong> ${new Date().toLocaleString('en-AU', { timeZone: 'Australia/Brisbane' })}</p>
          </div>

          <div style="background: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107;">
            <h3 style="margin-top: 0; color: #856404;">🔍 Error Details</h3>
            <p style="margin: 0; font-family: monospace; background: white; padding: 10px; border-radius: 4px;">${error}</p>
          </div>

          <div style="background: #d1ecf1; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #0c5460;">🛠️ Next Steps</h3>
            <ul style="margin: 0; padding-left: 20px;">
              <li>Check your ${platform} account connection in TheAgencyIQ dashboard</li>
              <li>Verify your ${platform} account permissions and API access</li>
              <li>Try republishing the post manually</li>
              <li>Contact support if the issue persists</li>
            </ul>
          </div>

          <p style="color: #666;">Don't worry - our system will automatically retry failed posts when possible. 🔄</p>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #888; font-size: 12px;">
            <p>TheAgencyIQ - Queensland Small Business Social Media Automation</p>
          </div>
        </div>
      `;

      const textContent = `
Post Publishing Failed

Platform: ${platform.charAt(0).toUpperCase() + platform.slice(1)}
Post ID: ${postId}
Failed At: ${new Date().toLocaleString('en-AU', { timeZone: 'Australia/Brisbane' })}

Error Details:
${error}

Next Steps:
- Check your ${platform} account connection in TheAgencyIQ dashboard
- Verify your ${platform} account permissions and API access
- Try republishing the post manually
- Contact support if the issue persists

Don't worry - our system will automatically retry failed posts when possible.

TheAgencyIQ - Queensland Small Business Social Media Automation
      `;

      const message = {
        to: email,
        from: process.env.SENDGRID_FROM_EMAIL || 'noreply@theagencyiq.com',
        subject,
        text: textContent,
        html: htmlContent
      };

      const response = await this.mailService.send(message);
      
      console.log(`📧 [EMAIL] Failure notification sent to ${email}`);
      return {
        success: true,
        messageId: response[0].headers['x-message-id']
      };

    } catch (error: any) {
      console.error(`❌ [EMAIL] Failed to send failure email:`, error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Send success SMS via Twilio
   */
  private async sendSuccessSMS(
    phoneNumber: string,
    platform: string,
    postId: number,
    platformPostId: string
  ): Promise<NotificationResult> {
    try {
      const message = `🎉 TheAgencyIQ: Your post #${postId} was successfully published to ${platform.charAt(0).toUpperCase() + platform.slice(1)}! Platform ID: ${platformPostId}. Check your analytics in the dashboard. 🇦🇺`;

      const response = await this.twilioClient.messages.create({
        body: message,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: phoneNumber
      });

      console.log(`📱 [SMS] Success notification sent to ${phoneNumber}`);
      return {
        success: true,
        messageId: response.sid
      };

    } catch (error: any) {
      console.error(`❌ [SMS] Failed to send success SMS:`, error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Send failure SMS via Twilio
   */
  private async sendFailureSMS(
    phoneNumber: string,
    platform: string,
    postId: number,
    error: string
  ): Promise<NotificationResult> {
    try {
      const shortError = error.length > 100 ? error.substring(0, 97) + '...' : error;
      const message = `⚠️ TheAgencyIQ: Post #${postId} failed to publish to ${platform.charAt(0).toUpperCase() + platform.slice(1)}. Error: ${shortError}. Check dashboard for details.`;

      const response = await this.twilioClient.messages.create({
        body: message,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: phoneNumber
      });

      console.log(`📱 [SMS] Failure notification sent to ${phoneNumber}`);
      return {
        success: true,
        messageId: response.sid
      };

    } catch (error: any) {
      console.error(`❌ [SMS] Failed to send failure SMS:`, error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Send bulk notification summary
   */
  async sendBulkSummaryNotification(
    userId: number,
    results: { total: number; successful: number; failed: number; platforms: string[] }
  ): Promise<void> {
    try {
      const user = await storage.getUser(userId);
      if (!user || !user.email) return;

      const subject = `📊 Bulk Publishing Complete - ${results.successful}/${results.total} Posts Published`;
      
      const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #17a2b8;">📊 Bulk Publishing Summary</h2>
          
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
              <span><strong>Total Posts:</strong></span>
              <span>${results.total}</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
              <span style="color: #28a745;"><strong>✅ Successfully Published:</strong></span>
              <span style="color: #28a745;">${results.successful}</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
              <span style="color: #dc3545;"><strong>❌ Failed:</strong></span>
              <span style="color: #dc3545;">${results.failed}</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span><strong>Platforms:</strong></span>
              <span>${results.platforms.join(', ')}</span>
            </div>
          </div>

          <p style="color: #666;">Check your TheAgencyIQ dashboard for detailed analytics and any failed post details.</p>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #888; font-size: 12px;">
            <p>TheAgencyIQ - Queensland Small Business Social Media Automation</p>
          </div>
        </div>
      `;

      const message = {
        to: user.email,
        from: process.env.SENDGRID_FROM_EMAIL || 'noreply@theagencyiq.com',
        subject,
        html: htmlContent
      };

      await this.mailService.send(message);
      console.log(`📊 [EMAIL] Bulk summary sent to ${user.email}`);

    } catch (error: any) {
      console.error(`❌ [EMAIL] Failed to send bulk summary:`, error);
    }
  }
}