const axios = require('axios');
const winston = require('winston');

// Configure logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/twilio-sendgrid-test.log' }),
    new winston.transports.Console()
  ]
});

class TwilioSendGridValidator {
  constructor(baseUrl) {
    this.baseUrl = baseUrl;
    this.twilioConfigured = !!process.env.TWILIO_ACCOUNT_SID;
    this.sendGridConfigured = !!process.env.SENDGRID_API_KEY;
  }

  // Test Twilio phone verification
  async testTwilioPhoneVerification(phoneNumber) {
    try {
      logger.info('Testing Twilio phone verification', { phone: phoneNumber, configured: this.twilioConfigured });
      
      // Send OTP
      const otpResponse = await axios.post(`${this.baseUrl}/api/onboarding/send-phone-otp`, {
        phone: phoneNumber,
        verificationToken: 'test-token-' + Date.now()
      });

      if (this.twilioConfigured) {
        // Expect success with Twilio configured
        if (!otpResponse.data.success) {
          throw new Error('Twilio OTP should succeed when configured');
        }
        
        logger.info('Twilio OTP sent successfully', { 
          sid: otpResponse.data.sid,
          expiresIn: otpResponse.data.expiresIn 
        });

        // Test verification with mock code
        const verifyResponse = await axios.post(`${this.baseUrl}/api/onboarding/verify-phone-otp`, {
          phone: phoneNumber,
          otp: '123456', // Mock code - should fail
          verificationToken: 'test-token-' + Date.now()
        });

        // Should fail with mock code
        if (verifyResponse.data.success) {
          logger.warn('Mock OTP unexpectedly succeeded');
        } else {
          logger.info('Mock OTP correctly failed verification');
        }

      } else {
        // Expect graceful fallback without Twilio
        if (otpResponse.data.success) {
          logger.warn('OTP succeeded without Twilio configuration');
        } else {
          logger.info('OTP gracefully failed without Twilio', { 
            error: otpResponse.data.error 
          });
        }
      }

      return {
        success: true,
        twilioConfigured: this.twilioConfigured,
        otpSent: otpResponse.data.success,
        response: otpResponse.data
      };

    } catch (error) {
      logger.error('Twilio phone verification test failed', { 
        error: error.message,
        phone: phoneNumber,
        configured: this.twilioConfigured
      });
      
      return {
        success: false,
        error: error.message,
        twilioConfigured: this.twilioConfigured
      };
    }
  }

  // Test SendGrid email verification
  async testSendGridEmailVerification(email, firstName = 'Test') {
    try {
      logger.info('Testing SendGrid email verification', { 
        email, 
        configured: this.sendGridConfigured 
      });

      const emailResponse = await axios.post(`${this.baseUrl}/api/onboarding/send-email-verification`, {
        email: email,
        firstName: firstName,
        verificationToken: 'test-token-' + Date.now()
      });

      if (this.sendGridConfigured) {
        // Expect success with SendGrid configured
        if (!emailResponse.data.success) {
          throw new Error('SendGrid email should succeed when configured');
        }
        
        logger.info('SendGrid email sent successfully', { 
          messageId: emailResponse.data.messageId,
          email: email
        });

        // Test email verification callback
        const callbackResponse = await axios.get(`${this.baseUrl}/api/verify-email`, {
          params: {
            token: 'test-verification-token',
            email: email
          }
        });

        logger.info('Email verification callback tested', { 
          status: callbackResponse.status 
        });

      } else {
        // Expect graceful fallback without SendGrid
        if (emailResponse.data.success) {
          logger.warn('Email succeeded without SendGrid configuration');
        } else {
          logger.info('Email gracefully failed without SendGrid', { 
            error: emailResponse.data.error 
          });
        }
      }

      return {
        success: true,
        sendGridConfigured: this.sendGridConfigured,
        emailSent: emailResponse.data.success,
        response: emailResponse.data
      };

    } catch (error) {
      logger.error('SendGrid email verification test failed', { 
        error: error.message,
        email: email,
        configured: this.sendGridConfigured
      });
      
      return {
        success: false,
        error: error.message,
        sendGridConfigured: this.sendGridConfigured
      };
    }
  }

  // Test notification integration
  async testNotificationIntegration() {
    const results = {
      twilio: await this.testTwilioPhoneVerification('+61412345678'),
      sendGrid: await this.testSendGridEmailVerification('test@theagencyiq.com.au', 'TestUser')
    };

    logger.info('Notification integration test completed', {
      twilioSuccess: results.twilio.success,
      sendGridSuccess: results.sendGrid.success,
      twilioConfigured: results.twilio.twilioConfigured,
      sendGridConfigured: results.sendGrid.sendGridConfigured
    });

    return results;
  }

  // Get configuration status
  getConfigurationStatus() {
    return {
      twilio: {
        configured: this.twilioConfigured,
        accountSid: process.env.TWILIO_ACCOUNT_SID ? 'Set' : 'Missing',
        authToken: process.env.TWILIO_AUTH_TOKEN ? 'Set' : 'Missing',
        verifySid: process.env.TWILIO_VERIFY_SID ? 'Set' : 'Missing'
      },
      sendGrid: {
        configured: this.sendGridConfigured,
        apiKey: process.env.SENDGRID_API_KEY ? 'Set' : 'Missing',
        fromEmail: process.env.SENDGRID_FROM_EMAIL ? 'Set' : 'Missing'
      }
    };
  }
}

module.exports = { TwilioSendGridValidator };