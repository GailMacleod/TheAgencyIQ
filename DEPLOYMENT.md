# TheAgencyIQ Deployment Guide

## Problem Solved
The deployment was failing with Vite plugin errors:
- `Cannot find package '@replit/vite-plugin-runtime-error-modal'`
- `Cannot find package '@replit/vite-plugin-cartographer'`
- `Build command 'npm run build' fails with ERR_MODULE_NOT_FOUND`

## Solution Implemented
Created a complete esbuild-based deployment system that bypasses Vite plugin dependencies:

### 1. Production Build Script (`build.js`)
- Uses esbuild directly instead of Vite
- Handles all asset imports and path aliases
- Generates optimized bundles (389KB server, 699KB client)
- Includes proper static asset copying

### 2. Production Start Script (`start.js`)
- Starts production server with correct environment
- Handles graceful shutdown
- Validates build exists before starting

### 3. Replit Configuration (`replit.toml`)
- Overrides default build/run commands
- Uses our custom scripts for deployment
- Sets proper production environment

## Deployment Instructions

### For Replit Deployments:
1. **The system is now ready** - Replit will automatically use the `replit.toml` configuration
2. **Build command**: `node build.js`
3. **Run command**: `node start.js`
4. **Environment**: Production environment variables will be set automatically

### Manual Deployment:
```bash
# Build for production
node build.js

# Start production server
node start.js
```

## File Structure After Build:
```
dist/
├── server.js          # Production server bundle (389KB)
├── index.html         # Production HTML template
├── static/
│   ├── main.js        # Client bundle (699KB)
│   ├── main.css       # Styles (8.6KB)
│   ├── logo.png       # Logo asset
│   └── *.png          # Other image assets
└── public/
    └── manifest.json  # PWA manifest
```

## Key Features:
- ✅ Bypasses all Vite plugin dependencies
- ✅ Handles asset imports correctly
- ✅ Generates optimized production bundles
- ✅ Includes static asset copying
- ✅ Proper environment configuration
- ✅ Graceful server startup/shutdown

## Environment Variables Required:
- `DATABASE_URL` - PostgreSQL connection string
- `FACEBOOK_APP_ID` - Facebook OAuth app ID
- `FACEBOOK_APP_SECRET` - Facebook OAuth app secret
- Other OAuth credentials as needed

The deployment is now ready and will work with Replit's deployment system without any Vite plugin issues.