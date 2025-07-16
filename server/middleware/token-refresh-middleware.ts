/**
 * Token Refresh Middleware
 * Validates and refreshes platform tokens before API requests
 */

import { Request, Response, NextFunction } from 'express';
import { TokenRefreshService } from '../services/token-refresh-service';
import { storage } from '../storage';

interface AuthenticatedRequest extends Request {
  user?: { id: number };
  platformTokens?: { [platform: string]: string };
}

export const tokenRefreshMiddleware = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id || (req as any).session?.userId;
    
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Get platforms from request body
    const platforms = req.body?.platforms || [];
    
    if (platforms.length === 0) {
      return next(); // No platforms specified, skip token refresh
    }

    console.log(`🔄 Token refresh middleware: validating tokens for ${platforms.join(', ')}`);

    // Validate and refresh tokens for all platforms
    const tokenResults = await TokenRefreshService.validateAndRefreshTokens(userId, platforms);
    
    // Get valid tokens for each platform
    const platformTokens: { [platform: string]: string } = {};
    
    for (const platform of platforms) {
      if (tokenResults[platform]) {
        const token = await TokenRefreshService.getValidToken(userId, platform);
        if (token) {
          platformTokens[platform] = token;
        }
      }
    }

    // Attach tokens to request for use in route handlers
    req.platformTokens = platformTokens;

    // Log token status
    const validTokens = Object.keys(platformTokens);
    const invalidTokens = platforms.filter((p: string) => !validTokens.includes(p));
    
    if (validTokens.length > 0) {
      console.log(`✅ Valid tokens for: ${validTokens.join(', ')}`);
    }
    
    if (invalidTokens.length > 0) {
      console.log(`❌ Invalid/expired tokens for: ${invalidTokens.join(', ')}`);
    }

    next();
    
  } catch (error) {
    console.error('❌ Token refresh middleware error:', error);
    return res.status(500).json({ 
      error: 'Token validation failed',
      message: error.message 
    });
  }
};

export default tokenRefreshMiddleware;