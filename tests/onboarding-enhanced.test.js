const axios = require('axios');
const winston = require('winston');
const { db } = require('../server/db');
const { users } = require('../shared/schema');
const { eq } = require('drizzle-orm');

// Configure axios defaults to prevent hanging
axios.defaults.timeout = 5000; // 5 second timeout
axios.defaults.headers.common['Content-Type'] = 'application/json';

// Configuration with environment fallback
const BASE_URL = process.env.BASE_URL || process.env.REPLIT_DOMAINS || 'http://localhost:5000';

// Configure Winston audit logging
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
      return `${timestamp} [${level.toUpperCase()}] ${message} ${Object.keys(meta).length ? JSON.stringify(meta) : ''}`;
    })
  ),
  transports: [
    new winston.transports.File({ 
      filename: 'logs/onboarding-test-audit.log',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
      tailable: true
    }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});

// Test data management
const TEST_USERS = [];
const TEST_EMAIL = 'enhanced-test@theagencyiq.com.au';
const TEST_PHONE = '+61412345678';

// Database cleanup utility
async function cleanupTestData() {
  try {
    for (const testUser of TEST_USERS) {
      if (testUser.id) {
        await db.delete(users).where(eq(users.id, testUser.id));
        logger.info('Cleaned up test user', { userId: testUser.id, email: testUser.email });
      }
    }
    TEST_USERS.length = 0; // Clear array
    logger.info('Database cleanup completed');
  } catch (error) {
    logger.error('Database cleanup failed', { error: error.message });
    throw error;
  }
}

// Enhanced test runner with automated assertions
describe('Customer Onboarding Enhanced Test Suite', () => {
  let testResults = {
    totalTests: 0,
    passedTests: 0,
    failedTests: 0
  };

  beforeAll(async () => {
    logger.info('Starting enhanced onboarding test suite', { baseUrl: BASE_URL });
  });

  afterAll(async () => {
    await cleanupTestData();
    logger.info('Test suite completed', testResults);
  });

  beforeEach(() => {
    testResults.totalTests++;
  });

  afterEach((done) => {
    if (done.failing) {
      testResults.failedTests++;
    } else {
      testResults.passedTests++;
    }
  });

  test('Data Validation with Comprehensive Edge Cases', async () => {
    try {
      // Valid data test with proper structure check
      const validData = {
        email: TEST_EMAIL,
        phone: TEST_PHONE,
        firstName: 'John',
        lastName: 'Smith',
        businessName: 'Queensland SME Pty Ltd',
        subscriptionPlan: 'professional'
      };
      
      const validResponse = await axios.post(`${BASE_URL}/api/onboarding/validate`, validData);
      
      // Automated assertions with proper structure validation
      expect(validResponse.status).toBe(200);
      expect(validResponse.data).toHaveProperty('success', true);
      expect(validResponse.data).toHaveProperty('valid', true);
      expect(validResponse.data).toHaveProperty('verificationToken');
      expect(typeof validResponse.data.verificationToken).toBe('string');
      
      logger.info('Valid data validation passed', { 
        email: validData.email,
        verificationToken: validResponse.data.verificationToken?.substring(0, 8) + '...'
      });

      // Invalid phone format test
      const invalidPhoneData = {
        email: 'invalid-phone-test@example.com',
        phone: '123-not-valid',
        firstName: 'John'
      };
      
      await expect(
        axios.post(`${BASE_URL}/api/onboarding/validate`, invalidPhoneData)
      ).rejects.toMatchObject({
        response: {
          status: 400,
          data: expect.objectContaining({
            errors: expect.arrayContaining([
              expect.stringMatching(/Invalid phone format/)
            ])
          })
        }
      });

      logger.info('Invalid phone format validation passed');

      // Extremely long email test
      const longEmailData = {
        email: 'a'.repeat(300) + '@example.com',
        phone: TEST_PHONE,
        firstName: 'John'
      };
      
      await expect(
        axios.post(`${BASE_URL}/api/onboarding/validate`, longEmailData)
      ).rejects.toMatchObject({
        response: {
          status: 400
        }
      });

      logger.info('Long email validation passed');

    } catch (error) {
      logger.error('Data validation test failed', { 
        error: error.message,
        response: error.response?.data 
      });
      throw error;
    }
  }, 10000); // 10 second timeout for test

  test('Twilio OTP Integration with Error Handling', async () => {
    try {
      const otpData = {
        phone: TEST_PHONE,
        verificationToken: 'test-token-123'
      };
      
      const otpResponse = await axios.post(`${BASE_URL}/api/onboarding/send-phone-otp`, otpData);
      
      // Automated structure validation
      expect(otpResponse.status).toBe(200);
      expect(otpResponse.data).toHaveProperty('success');
      expect(otpResponse.data).toHaveProperty('sid');
      
      if (otpResponse.data.success) {
        logger.info('Twilio OTP sent successfully', { 
          phone: TEST_PHONE,
          sid: otpResponse.data.sid 
        });
      } else {
        logger.warn('Twilio OTP fallback activated', { 
          message: otpResponse.data.message 
        });
      }

      // Test OTP verification
      const verifyData = {
        phone: TEST_PHONE,
        otp: '123456', // Mock OTP for testing
        verificationToken: 'test-token-123'
      };
      
      const verifyResponse = await axios.post(`${BASE_URL}/api/onboarding/verify-phone-otp`, verifyData);
      expect(verifyResponse.status).toBe(200);
      expect(verifyResponse.data).toHaveProperty('success');
      
      logger.info('OTP verification test completed', { verified: verifyResponse.data.success });

    } catch (error) {
      logger.error('Twilio OTP test failed', { 
        error: error.message,
        response: error.response?.data 
      });
      throw error;
    }
  }, 10000);

  test('SendGrid Email Verification with Template Validation', async () => {
    try {
      const emailData = {
        email: TEST_EMAIL,
        firstName: 'John',
        verificationToken: 'test-token-456'
      };
      
      const emailResponse = await axios.post(`${BASE_URL}/api/onboarding/send-email-verification`, emailData);
      
      // Automated assertions with proper structure check
      expect(emailResponse.status).toBe(200);
      expect(emailResponse.data).toHaveProperty('success');
      expect(emailResponse.data).toHaveProperty('messageId');
      
      if (emailResponse.data.success) {
        logger.info('SendGrid email sent successfully', { 
          email: TEST_EMAIL,
          messageId: emailResponse.data.messageId 
        });
      } else {
        logger.warn('Email sending fallback activated', { 
          message: emailResponse.data.message 
        });
      }

    } catch (error) {
      logger.error('SendGrid email test failed', { 
        error: error.message,
        response: error.response?.data 
      });
      throw error;
    }
  });

  test('Drizzle Database Integration with Cleanup', async () => {
    try {
      const registrationData = {
        email: 'drizzle-test@theagencyiq.com.au',
        phone: '+61412345679',
        firstName: 'Database',
        lastName: 'Test',
        businessName: 'Test Business',
        subscriptionPlan: 'professional',
        phoneVerified: true,
        emailVerified: true
      };
      
      const registrationResponse = await axios.post(`${BASE_URL}/api/onboarding/complete`, registrationData);
      
      // Automated assertions
      expect(registrationResponse.status).toBe(200);
      expect(registrationResponse.data).toHaveProperty('success', true);
      expect(registrationResponse.data).toHaveProperty('user');
      expect(registrationResponse.data.user).toHaveProperty('id');
      
      // Store for cleanup
      TEST_USERS.push({
        id: registrationResponse.data.user.id,
        email: registrationData.email
      });
      
      logger.info('Drizzle database integration passed', { 
        userId: registrationResponse.data.user.id,
        email: registrationData.email 
      });

      // Verify user exists in database
      const [dbUser] = await db.select().from(users).where(eq(users.id, registrationResponse.data.user.id));
      expect(dbUser).toBeTruthy();
      expect(dbUser.email).toBe(registrationData.email);
      
      logger.info('Database verification passed', { userId: dbUser.id });

    } catch (error) {
      logger.error('Drizzle database test failed', { 
        error: error.message,
        response: error.response?.data 
      });
      throw error;
    }
  });

  test('Guest Mode Fallback with Limitations', async () => {
    try {
      const guestResponse = await axios.post(`${BASE_URL}/api/onboarding/guest-mode`, {});
      
      // Automated assertions with structure validation
      expect(guestResponse.status).toBe(200);
      expect(guestResponse.data).toHaveProperty('success', true);
      expect(guestResponse.data).toHaveProperty('guestId');
      expect(guestResponse.data).toHaveProperty('accessLevel', 'guest');
      expect(guestResponse.data).toHaveProperty('limitations');
      expect(Array.isArray(guestResponse.data.limitations)).toBe(true);
      
      logger.info('Guest mode fallback passed', { 
        guestId: guestResponse.data.guestId,
        limitations: guestResponse.data.limitations.length 
      });

    } catch (error) {
      logger.error('Guest mode test failed', { 
        error: error.message,
        response: error.response?.data 
      });
      throw error;
    }
  });

  test('Comprehensive Error Handling and Edge Cases', async () => {
    try {
      // Missing required fields
      await expect(
        axios.post(`${BASE_URL}/api/onboarding/validate`, {})
      ).rejects.toMatchObject({
        response: {
          status: 400
        }
      });

      // Invalid email format
      await expect(
        axios.post(`${BASE_URL}/api/onboarding/validate`, {
          email: 'not-an-email',
          phone: TEST_PHONE,
          firstName: 'Test'
        })
      ).rejects.toMatchObject({
        response: {
          status: 400
        }
      });

      // Invalid subscription plan
      await expect(
        axios.post(`${BASE_URL}/api/onboarding/validate`, {
          email: 'valid@email.com',
          phone: TEST_PHONE,
          firstName: 'Test',
          subscriptionPlan: 'invalid-plan'
        })
      ).rejects.toMatchObject({
        response: {
          status: 400
        }
      });

      logger.info('Comprehensive error handling validation passed');

    } catch (error) {
      logger.error('Error handling test failed', { 
        error: error.message 
      });
      throw error;
    }
  });
});

// Export for standalone usage
module.exports = {
  cleanupTestData,
  logger,
  BASE_URL
};