/**
 * Environment Schema Validation
 * Validates all required environment variables with proper types and defaults
 */

import Joi from 'joi';

const envSchema = Joi.object({
  // Server Configuration
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  PORT: Joi.number().default(5000),
  
  // Database
  DATABASE_URL: Joi.string().uri().required(),
  PGHOST: Joi.string().when('DATABASE_URL', { is: Joi.exist(), then: Joi.optional() }),
  PGPORT: Joi.number().when('DATABASE_URL', { is: Joi.exist(), then: Joi.optional() }),
  PGUSER: Joi.string().when('DATABASE_URL', { is: Joi.exist(), then: Joi.optional() }),
  PGPASSWORD: Joi.string().when('DATABASE_URL', { is: Joi.exist(), then: Joi.optional() }),
  PGDATABASE: Joi.string().when('DATABASE_URL', { is: Joi.exist(), then: Joi.optional() }),

  // Session & Security
  SESSION_SECRET: Joi.string().min(32).required(),
  COOKIE_SECRET: Joi.string().min(32).optional(),

  // OAuth Providers
  FACEBOOK_APP_ID: Joi.string().optional(),
  FACEBOOK_APP_SECRET: Joi.string().when('FACEBOOK_APP_ID', { is: Joi.exist(), then: Joi.required() }),
  
  GOOGLE_CLIENT_ID: Joi.string().optional(),
  GOOGLE_CLIENT_SECRET: Joi.string().when('GOOGLE_CLIENT_ID', { is: Joi.exist(), then: Joi.required() }),
  
  LINKEDIN_CLIENT_ID: Joi.string().optional(),
  LINKEDIN_CLIENT_SECRET: Joi.string().when('LINKEDIN_CLIENT_ID', { is: Joi.exist(), then: Joi.required() }),
  
  TWITTER_CONSUMER_KEY: Joi.string().optional(),
  TWITTER_CONSUMER_SECRET: Joi.string().when('TWITTER_CONSUMER_KEY', { is: Joi.exist(), then: Joi.required() }),

  // Notifications
  SENDGRID_API_KEY: Joi.string().optional(),
  SENDGRID_FROM_EMAIL: Joi.string().email().when('SENDGRID_API_KEY', { is: Joi.exist(), then: Joi.required() }),
  
  TWILIO_ACCOUNT_SID: Joi.string().optional(),
  TWILIO_AUTH_TOKEN: Joi.string().when('TWILIO_ACCOUNT_SID', { is: Joi.exist(), then: Joi.required() }),
  TWILIO_VERIFY_SERVICE_SID: Joi.string().optional(),
  TWILIO_PHONE_NUMBER: Joi.string().when('TWILIO_ACCOUNT_SID', { is: Joi.exist(), then: Joi.required() }),

  // AI Services
  OPENAI_API_KEY: Joi.string().optional(),
  GOOGLE_AI_STUDIO_KEY: Joi.string().optional(),

  // Replit Configuration
  REPLIT_DOMAINS: Joi.string().optional(),
  REPL_ID: Joi.string().optional(),

  // Monitoring
  SENTRY_DSN: Joi.string().uri().optional(),

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: Joi.number().default(15 * 60 * 1000), // 15 minutes
  RATE_LIMIT_MAX_REQUESTS: Joi.number().default(100),
  
  // Feature Flags
  ENABLE_OAUTH_DEBUG: Joi.boolean().default(false),
  ENABLE_QUOTA_STRICT_MODE: Joi.boolean().default(true),
  ENABLE_AUTO_POSTING: Joi.boolean().default(true)
}).unknown(); // Allow unknown env vars

export interface ValidatedEnv {
  NODE_ENV: 'development' | 'production' | 'test';
  PORT: number;
  DATABASE_URL: string;
  SESSION_SECRET: string;
  COOKIE_SECRET?: string;
  
  // OAuth
  FACEBOOK_APP_ID?: string;
  FACEBOOK_APP_SECRET?: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  LINKEDIN_CLIENT_ID?: string;
  LINKEDIN_CLIENT_SECRET?: string;
  TWITTER_CONSUMER_KEY?: string;
  TWITTER_CONSUMER_SECRET?: string;
  
  // Notifications
  SENDGRID_API_KEY?: string;
  SENDGRID_FROM_EMAIL?: string;
  TWILIO_ACCOUNT_SID?: string;
  TWILIO_AUTH_TOKEN?: string;
  TWILIO_VERIFY_SERVICE_SID?: string;
  TWILIO_PHONE_NUMBER?: string;
  
  // AI
  OPENAI_API_KEY?: string;
  GOOGLE_AI_STUDIO_KEY?: string;
  
  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: number;
  RATE_LIMIT_MAX_REQUESTS: number;
  
  // Feature Flags
  ENABLE_OAUTH_DEBUG: boolean;
  ENABLE_QUOTA_STRICT_MODE: boolean;
  ENABLE_AUTO_POSTING: boolean;
}

export function validateEnvironment(): ValidatedEnv {
  console.log('🔍 Validating environment configuration...');
  
  const { error, value } = envSchema.validate(process.env, {
    abortEarly: false,
    stripUnknown: false
  });

  if (error) {
    console.error('❌ Environment validation failed:');
    error.details.forEach(detail => {
      console.error(`  - ${detail.message}`);
    });
    throw new Error('Invalid environment configuration');
  }

  // Log OAuth configuration status
  const oauthProviders = [];
  if (value.FACEBOOK_APP_ID && value.FACEBOOK_APP_SECRET) oauthProviders.push('Facebook');
  if (value.GOOGLE_CLIENT_ID && value.GOOGLE_CLIENT_SECRET) oauthProviders.push('Google');
  if (value.LINKEDIN_CLIENT_ID && value.LINKEDIN_CLIENT_SECRET) oauthProviders.push('LinkedIn');
  if (value.TWITTER_CONSUMER_KEY && value.TWITTER_CONSUMER_SECRET) oauthProviders.push('Twitter');

  console.log('🔐 OAuth Configuration Status:');
  if (oauthProviders.length > 0) {
    console.log(`   ✅ Configured: ${oauthProviders.join(', ')}`);
  }
  
  const missingProviders = [];
  if (!value.FACEBOOK_APP_ID) missingProviders.push('Facebook');
  if (!value.GOOGLE_CLIENT_ID) missingProviders.push('Google');
  if (!value.LINKEDIN_CLIENT_ID) missingProviders.push('LinkedIn');
  if (!value.TWITTER_CONSUMER_KEY) missingProviders.push('Twitter');
  
  if (missingProviders.length > 0) {
    console.log(`   ⚠️ Missing: ${missingProviders.join(', ')}`);
  }

  // Log notification service status
  const notifications = [];
  if (value.SENDGRID_API_KEY) notifications.push('SendGrid');
  if (value.TWILIO_ACCOUNT_SID) notifications.push('Twilio');
  
  if (notifications.length > 0) {
    console.log(`📧 Notification Services: ${notifications.join(', ')}`);
  }

  console.log('✅ Environment validation passed');
  return value as ValidatedEnv;
}

export function getRequiredSecrets(): { missing: string[], configured: string[] } {
  const secrets = [
    'SESSION_SECRET',
    'DATABASE_URL',
    'SENDGRID_API_KEY',
    'TWILIO_ACCOUNT_SID',
    'FACEBOOK_APP_ID',
    'GOOGLE_CLIENT_ID',
    'LINKEDIN_CLIENT_ID',
    'TWITTER_CONSUMER_KEY',
    'OPENAI_API_KEY'
  ];

  const configured = secrets.filter(secret => !!process.env[secret]);
  const missing = secrets.filter(secret => !process.env[secret]);

  return { configured, missing };
}

export const env = validateEnvironment();