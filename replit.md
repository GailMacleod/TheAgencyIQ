# The AgencyIQ - Social Media Automation Platform

## Overview

The AgencyIQ is a comprehensive social media automation platform built for Australian small businesses. It integrates with multiple social media platforms (X/Twitter, Facebook, Instagram, LinkedIn, YouTube) to provide AI-powered content generation and automated post scheduling. The system uses a phone-based user identification system and subscription tiers to manage user access and posting quotas.

## System Architecture

### Backend Architecture
- **Framework**: Node.js with Express.js
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Session-based authentication with phone number as unique identifier
- **SMS Verification**: Twilio integration for phone number verification
- **AI Integration**: xAI/Grok for content generation

### Frontend Architecture
- **Framework**: React with TypeScript
- **Styling**: Tailwind CSS with shadcn/ui components
- **Build Tool**: Vite
- **State Management**: React hooks and context

### Database Schema
- **Users**: Phone-based UID system with subscription management
- **Platform Connections**: OAuth tokens and connection status for each social platform
- **Posts**: Content management with scheduling and status tracking
- **Gift Certificates**: Redemption system for subscription upgrades
- **Sessions**: Session management for user authentication

## Key Components

### Authentication System
- Phone number-based user identification (phone UID architecture)
- Two-step SMS verification process using Twilio
- Session management with PostgreSQL session store
- Gift certificate redemption system

### Social Media Integration
- **OAuth 2.0 Flows**: Individual OAuth implementations for each platform
- **Multi-Platform Support**: X/Twitter, Facebook, Instagram, LinkedIn, YouTube
- **Token Management**: Automatic token refresh and error handling
- **Publishing Pipeline**: Automated post scheduling and publication

### Content Management
- **AI Content Generation**: xAI integration for intelligent content creation
- **Post Scheduling**: Time-based scheduling with subscription quota enforcement
- **Status Tracking**: Draft, approved, published, and failed post states
- **Platform-Specific Formatting**: Tailored content for each social platform

### Subscription Management
- **Tiered Plans**: Starter (10 posts), Professional (52 posts), Enterprise (unlimited)
- **Quota Enforcement**: Real-time post limit checking
- **Stripe Integration**: Payment processing and subscription management

## Data Flow

1. **User Registration**: Phone number verification → User account creation
2. **Platform Connection**: OAuth flow → Token storage → Connection validation
3. **Content Creation**: AI generation → User approval → Post scheduling
4. **Publishing**: Auto-posting enforcer → Platform APIs → Status updates
5. **Analytics**: Real-time engagement tracking → Performance metrics

## External Dependencies

### Core Services
- **Twilio**: SMS verification and phone number validation
- **xAI/Grok**: AI-powered content generation
- **Stripe**: Payment processing and subscription management

### Social Media APIs
- **X/Twitter API v2**: OAuth 2.0 with user context tokens
- **Facebook Graph API**: Page access tokens with posting permissions
- **Instagram Business API**: Integrated through Facebook Graph API
- **LinkedIn API**: Member social posting capabilities
- **YouTube Data API**: Video content publishing

### Infrastructure
- **PostgreSQL**: Primary data storage
- **Replit**: Development and hosting environment
- **Ngrok**: Local development tunneling for OAuth callbacks

## Deployment Strategy

The application is configured for multiple deployment targets:

### Development Environment
- **Local Setup**: PostgreSQL + Node.js development server
- **Port Configuration**: Frontend (3000), Backend (5000)
- **Environment Variables**: Local .env file with development credentials

### Production Deployment
- **Target**: Google Cloud Engine (GCE) via Replit deployment
- **Build Process**: `npm run build` → static asset generation
- **Runtime**: `npm run start` → production server
- **Database**: PostgreSQL with connection pooling

### Microservice Architecture
- **Phone Update Service**: Standalone Express server for phone number updates
- **SQLite Backup**: Local data persistence option
- **Service Discovery**: Automatic endpoint routing

## Changelog

- June 24, 2025. Initial setup

## User Preferences

Preferred communication style: Simple, everyday language.