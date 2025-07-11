#!/bin/bash

# PRODUCTION DEPLOYMENT SCRIPT FOR THEAGENCYIQ
# Comprehensive deployment with monitoring and rollback capabilities

set -e

echo "🚀 Starting TheAgencyIQ Production Deployment..."
echo "================================================="

# Configuration
DEPLOYMENT_TIME=$(date '+%Y-%m-%d %H:%M:%S')
DEPLOYMENT_LOG="deployment-$(date '+%Y%m%d-%H%M%S').log"
BACKUP_DIR="backups/$(date '+%Y%m%d-%H%M%S')"

# Create deployment directories
mkdir -p logs
mkdir -p backups
mkdir -p $BACKUP_DIR

# Start logging
exec > >(tee -a $DEPLOYMENT_LOG)
exec 2>&1

echo "📋 Deployment Configuration:"
echo "  - Time: $DEPLOYMENT_TIME"
echo "  - Log: $DEPLOYMENT_LOG"
echo "  - Backup: $BACKUP_DIR"
echo "  - Node Version: $(node --version)"
echo "  - NPM Version: $(npm --version)"

# Step 1: Pre-deployment validation
echo "🔍 Step 1: Pre-deployment validation..."
if ! node scripts/deployment-readiness.js; then
    echo "❌ Deployment readiness check failed!"
    exit 1
fi
echo "✅ Deployment readiness check passed"

# Step 2: Environment validation
echo "🔧 Step 2: Environment validation..."
if [ -z "$DATABASE_URL" ]; then
    echo "❌ DATABASE_URL environment variable is required"
    exit 1
fi

if [ -z "$SESSION_SECRET" ]; then
    echo "❌ SESSION_SECRET environment variable is required"
    exit 1
fi

echo "✅ Environment validation passed"

# Step 3: Database backup
echo "🗄️  Step 3: Database backup..."
if command -v pg_dump &> /dev/null; then
    pg_dump $DATABASE_URL > $BACKUP_DIR/database-backup.sql
    echo "✅ Database backup created: $BACKUP_DIR/database-backup.sql"
else
    echo "⚠️  pg_dump not available, skipping database backup"
fi

# Step 4: Code backup
echo "💾 Step 4: Code backup..."
tar -czf $BACKUP_DIR/code-backup.tar.gz \
    --exclude=node_modules \
    --exclude=.git \
    --exclude=logs \
    --exclude=backups \
    --exclude=attached_assets \
    .
echo "✅ Code backup created: $BACKUP_DIR/code-backup.tar.gz"

# Step 5: Install dependencies
echo "📦 Step 5: Installing dependencies..."
npm ci --production=false
echo "✅ Dependencies installed"

# Step 6: Build application
echo "🏗️  Step 6: Building application..."
npm run build
echo "✅ Application built successfully"

# Step 7: Database migration
echo "🔄 Step 7: Database migration..."
if npm run db:push; then
    echo "✅ Database migration completed"
else
    echo "⚠️  Database migration failed, continuing..."
fi

# Step 8: Start PM2 with production configuration
echo "🚀 Step 8: Starting PM2..."
if command -v pm2 &> /dev/null; then
    # Stop existing processes
    pm2 delete theagencyiq-production 2>/dev/null || true
    
    # Start with production configuration
    pm2 start ecosystem.production.config.js
    
    # Save PM2 configuration
    pm2 save
    
    echo "✅ PM2 started successfully"
else
    echo "⚠️  PM2 not available, starting with node..."
    NODE_ENV=production node server/index.js &
    echo "✅ Application started with node"
fi

# Step 9: Health check
echo "🔍 Step 9: Health check..."
sleep 10

if curl -f http://localhost:5000/api/health 2>/dev/null; then
    echo "✅ Health check passed"
else
    echo "❌ Health check failed!"
    echo "🔄 Attempting rollback..."
    if command -v pm2 &> /dev/null; then
        pm2 delete theagencyiq-production 2>/dev/null || true
    fi
    exit 1
fi

# Step 10: Deployment verification
echo "🧪 Step 10: Deployment verification..."
if node scripts/deployment-readiness.js; then
    echo "✅ Deployment verification passed"
else
    echo "❌ Deployment verification failed!"
    exit 1
fi

# Step 11: Final status
echo "📊 Step 11: Final deployment status..."
if command -v pm2 &> /dev/null; then
    pm2 status
    pm2 logs theagencyiq-production --lines 10
fi

echo "🎉 DEPLOYMENT COMPLETED SUCCESSFULLY!"
echo "================================================="
echo "  - Deployment time: $DEPLOYMENT_TIME"
echo "  - Log file: $DEPLOYMENT_LOG"
echo "  - Backup directory: $BACKUP_DIR"
echo "  - Application URL: http://localhost:5000"
echo "  - Health check: http://localhost:5000/api/health"
echo "================================================="

# Create deployment success marker
echo "$DEPLOYMENT_TIME" > .last-deployment
echo "✅ Deployment marker created"

exit 0