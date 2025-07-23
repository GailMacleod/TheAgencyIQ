import sgMail from '@sendgrid/mail';

// Initialize SendGrid
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

export async function sendOAuthConfirmationEmail(
  email: string,
  name: string,
  platform: string,
  accessDescription: string
): Promise<boolean> {
  if (!process.env.SENDGRID_API_KEY) {
    console.log('⚠️ SendGrid not configured - OAuth confirmation email skipped');
    return false;
  }

  try {
    const msg = {
      to: email,
      from: process.env.SENDGRID_FROM_EMAIL || 'noreply@theagencyiq.com',
      subject: `${platform} Connection Confirmed - TheAgencyIQ`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">TheAgencyIQ</h1>
            <p style="color: #bfdbfe; margin: 10px 0 0 0;">Queensland SME Social Media Automation</p>
          </div>
          
          <div style="background: #f8fafc; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e2e8f0;">
            <h2 style="color: #1e293b; margin-top: 0;">🎉 ${platform} Successfully Connected!</h2>
            
            <p style="color: #475569; font-size: 16px; line-height: 1.6;">
              Hi ${name},
            </p>
            
            <p style="color: #475569; font-size: 16px; line-height: 1.6;">
              Great news! Your <strong>${platform}</strong> account has been successfully connected to TheAgencyIQ. 
            </p>
            
            <div style="background: #e0f2fe; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #0369a1; margin-top: 0;">Access Granted:</h3>
              <p style="color: #0369a1; margin: 0;">${accessDescription}</p>
            </div>
            
            <p style="color: #475569; font-size: 16px; line-height: 1.6;">
              You can now:
            </p>
            <ul style="color: #475569; padding-left: 20px;">
              <li>Generate AI-powered content for ${platform}</li>
              <li>Schedule posts with intelligent timing</li>
              <li>Access VEO 2.0 cinematic video generation</li>
              <li>Monitor analytics and engagement</li>
            </ul>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.FRONTEND_URL || 'https://theagencyiq.com'}" 
                 style="background: #2563eb; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
                Start Creating Content
              </a>
            </div>
            
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;">
            
            <p style="color: #64748b; font-size: 14px; text-align: center;">
              If you didn't authorize this connection, please contact our support team immediately.
            </p>
            
            <p style="color: #64748b; font-size: 14px; text-align: center;">
              © 2025 TheAgencyIQ - Empowering Queensland SMEs with AI-driven social media automation
            </p>
          </div>
        </div>
      `
    };

    await sgMail.send(msg);
    console.log(`✅ OAuth confirmation email sent to ${email} for ${platform}`);
    return true;

  } catch (error) {
    console.error('SendGrid OAuth confirmation error:', error);
    return false;
  }
}

// Legacy sendEmail function for backward compatibility
export async function sendEmail(
  to: string,
  subject: string,
  html: string
): Promise<boolean> {
  if (!process.env.SENDGRID_API_KEY) {
    console.log('⚠️ SendGrid not configured - email skipped');
    return false;
  }

  try {
    const msg = {
      to,
      from: process.env.SENDGRID_FROM_EMAIL || 'noreply@theagencyiq.com',
      subject,
      html
    };

    await sgMail.send(msg);
    console.log(`✅ Email sent to ${to}`);
    return true;
  } catch (error) {
    console.error('SendGrid email error:', error);
    return false;
  }
}

export async function sendOAuthErrorEmail(
  email: string,
  name: string,
  platform: string,
  error: string
): Promise<boolean> {
  if (!process.env.SENDGRID_API_KEY) {
    console.log('⚠️ SendGrid not configured - OAuth error email skipped');
    return false;
  }

  try {
    const msg = {
      to: email,
      from: process.env.SENDGRID_FROM_EMAIL || 'noreply@theagencyiq.com',
      subject: `${platform} Connection Issue - TheAgencyIQ`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">TheAgencyIQ</h1>
            <p style="color: #fecaca; margin: 10px 0 0 0;">Connection Issue Detected</p>
          </div>
          
          <div style="background: #f8fafc; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e2e8f0;">
            <h2 style="color: #1e293b; margin-top: 0;">⚠️ ${platform} Connection Issue</h2>
            
            <p style="color: #475569; font-size: 16px; line-height: 1.6;">
              Hi ${name},
            </p>
            
            <p style="color: #475569; font-size: 16px; line-height: 1.6;">
              We encountered an issue connecting your <strong>${platform}</strong> account to TheAgencyIQ.
            </p>
            
            <div style="background: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc2626;">
              <h3 style="color: #dc2626; margin-top: 0;">Error Details:</h3>
              <p style="color: #dc2626; margin: 0; font-family: monospace; font-size: 14px;">${error}</p>
            </div>
            
            <p style="color: #475569; font-size: 16px; line-height: 1.6;">
              Please try connecting again or contact our support team for assistance.
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.FRONTEND_URL || 'https://theagencyiq.com'}/connect-platforms" 
                 style="background: #2563eb; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
                Try Again
              </a>
            </div>
            
            <p style="color: #64748b; font-size: 14px; text-align: center;">
              © 2025 TheAgencyIQ - Empowering Queensland SMEs with AI-driven social media automation
            </p>
          </div>
        </div>
      `
    };

    await sgMail.send(msg);
    console.log(`✅ OAuth error email sent to ${email} for ${platform}`);
    return true;

  } catch (error) {
    console.error('SendGrid OAuth error email failed:', error);
    return false;
  }
}