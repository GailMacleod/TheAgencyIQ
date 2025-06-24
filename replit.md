# TheAgencyIQ - Social Media Automation Platform

## Overview

TheAgencyIQ is a comprehensive social media automation platform built for Queensland small businesses. The system enables AI-powered content generation and automated posting across multiple social media platforms including X (Twitter), Facebook, Instagram, LinkedIn, and YouTube. The application provides subscription-based services with tiered posting quotas and real-time publishing capabilities.

## System Architecture

### Backend Architecture
- **Framework**: Node.js with Express server
- **Database**: PostgreSQL with Drizzle ORM for type-safe database operations
- **Authentication**: Session-based authentication with PostgreSQL session storage
- **API Design**: RESTful endpoints with JSON-only responses
- **Environment**: Replit deployment with Google Cloud Engine as deployment target

### Frontend Architecture
- **Framework**: React with TypeScript
- **Build Tool**: Vite for fast development and optimized builds
- **Styling**: Tailwind CSS with shadcn/ui components
- **State Management**: React hooks with localStorage for persistence
- **UI Components**: Modern component library with mobile-responsive design

### Database Architecture
- **Primary Database**: PostgreSQL with user phone number as unique identifier (UID)
- **ORM**: Drizzle with TypeScript schema definitions
- **Schema Location**: `shared/schema.ts` for type-safe database operations
- **Migration Management**: Drizzle Kit for database migrations

## Key Components

### User Management System
- **Phone-based Authentication**: Users identified by phone numbers with SMS verification via Twilio
- **Subscription Tiers**: Starter (10 posts), Professional (52 posts), Ultimate (unlimited)
- **User Schema**: Comprehensive user profiles with subscription tracking and post quotas

### Multi-Platform OAuth Integration
- **Supported Platforms**: X/Twitter OAuth 2.0, Facebook Graph API, Instagram Business API, LinkedIn API, YouTube API
- **Token Management**: Secure storage of access tokens with automatic refresh mechanisms
- **Connection Tracking**: Database-stored platform connections with active/inactive status

### AI Content Generation
- **Provider**: xAI/Grok integration for intelligent content creation
- **Content Types**: Platform-optimized posts with character limits and best practices
- **Scheduling**: Automated post scheduling with intelligent timing recommendations

### Auto-Publishing System
- **Real-time Publishing**: Immediate post publication upon approval
- **Error Handling**: Comprehensive retry logic and failure recovery
- **Platform Validation**: Token verification before publishing attempts
- **Status Tracking**: Detailed post status management (draft, approved, published, failed)

### Gift Certificate System
- **Database Table**: Gift certificates with unique codes, plan assignments, and redemption tracking
- **Admin Management**: Administrative endpoints for certificate generation and monitoring
- **Redemption Flow**: Automated subscription upgrades upon valid certificate redemption

## Data Flow

### User Registration and Authentication
1. User provides phone number and creates account
2. SMS verification code sent via Twilio
3. Account creation with phone UID system
4. Session establishment with PostgreSQL storage

### Platform Connection Flow
1. User initiates platform connection (OAuth flow)
2. Redirect to platform authorization endpoints
3. Authorization code exchange for access tokens
4. Secure token storage in platform_connections table
5. Connection validation and status update

### Content Creation and Publishing
1. User requests AI content generation
2. xAI/Grok generates platform-optimized content
3. Content stored in posts table with scheduling information
4. Auto-posting enforcer monitors for scheduled posts
5. Platform APIs called for content publication
6. Status updates and error handling

### Subscription and Quota Management
1. User subscription level determines post quotas
2. Post creation decrements available quota
3. Subscription upgrades via gift certificates
4. Real-time quota enforcement

## External Dependencies

### Third-Party Services
- **Twilio**: SMS verification and communication services
- **Facebook/Meta APIs**: Facebook and Instagram publishing
- **X (Twitter) API**: Tweet publishing with OAuth 2.0
- **LinkedIn API**: Professional network publishing
- **YouTube API**: Video content management
- **xAI/Grok**: AI-powered content generation

### Environment Variables
- Database: `DATABASE_URL` (PostgreSQL connection string)
- Twilio: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`
- Session: `SESSION_SECRET`
- Platform Credentials: Various OAuth client IDs and secrets for each platform

### NPM Dependencies
- **Core**: express, pg, drizzle-orm, @neondatabase/serverless
- **Authentication**: bcrypt, express-session, connect-pg-simple
- **Communication**: twilio, cors
- **Development**: tsx, @types/* packages for TypeScript support

## Deployment Strategy

### Development Environment
- **Local Setup**: PostgreSQL database with schema initialization
- **Development Server**: Hot reload with `npm run dev`
- **Port Configuration**: Server on port 5000, frontend on port 3001

### Production Deployment
- **Platform**: Google Cloud Engine via Replit deployment
- **Build Process**: `npm run build` for production optimization
- **Database**: Managed PostgreSQL with connection pooling
- **Environment**: Production environment variables and secrets management

### Data Management
- **Backup Strategy**: Automated PostgreSQL backups
- **Migration Management**: Drizzle migrations for schema changes
- **Data Retention**: Automated cleanup policies for old posts and expired tokens

## Changelog

- June 23, 2025: Initial setup
- June 23, 2025: Fixed critical post count erraticism and ledger logic issues
  - Root cause: Professional user had 79 posts instead of 52 quota limit
  - Solution: Implemented strict quota enforcement removing 27 excess posts
  - Result: Stabilized at exactly 52 posts matching professional plan
  - Impact: Prevents token refresh cascade failures and auto-posting issues
- June 24, 2025: LAUNCH COMPLETE - All systems operational for 9:00 AM JST
  - Fixed Instagram publishing with working Facebook page fallback system
  - Restored all OAuth connections: X, Facebook, LinkedIn, Instagram, YouTube
  - Confirmed AI-generated content displaying rich marketing copy with emojis and CTAs
  - Verified 52 post quota enforcement for professional subscription tier
  - Implemented bulletproof publishing with fallback mechanisms for reliability
  - Status: Ready for immediate deployment with 5-platform coverage

## User Preferences

Preferred communication style: Simple, everyday language.