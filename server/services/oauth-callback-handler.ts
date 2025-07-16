/**
 * OAuth Callback Handler Service
 * Handles OAuth callbacks with proper 302 redirects instead of 200 responses
 */

import { Request, Response } from 'express';
import { storage } from '../storage';

export class OAuthCallbackHandler {
  
  /**
   * Handle OAuth callback with proper redirect
   */
  static async handleCallback(req: Request, res: Response, platform: string, userData: any) {
    try {
      const userId = (req as any).session?.userId || (req as any).user?.id;
      
      if (!userId) {
        console.error(`❌ No user ID found in session for ${platform} callback`);
        return res.redirect('/login?error=session_expired');
      }

      // Save platform connection to database
      const connectionData = {
        userId: parseInt(userId),
        platform,
        platformUserId: userData.platformUserId || userData.id,
        platformUsername: userData.username || userData.displayName || userData.name,
        accessToken: userData.accessToken,
        refreshToken: userData.refreshToken,
        expiresAt: userData.expiresAt ? new Date(userData.expiresAt) : new Date(Date.now() + 3600000), // 1 hour default
        isActive: true
      };

      // Check if connection already exists
      const existingConnection = await storage.getPlatformConnection(userId, platform);
      
      if (existingConnection) {
        // Update existing connection
        await storage.updatePlatformConnectionByPlatform(userId, platform, connectionData);
        console.log(`✅ Updated ${platform} connection for user ${userId}`);
      } else {
        // Create new connection
        await storage.createPlatformConnection(connectionData);
        console.log(`✅ Created ${platform} connection for user ${userId}`);
      }

      // Redirect to platform connections page with success message
      return res.redirect(`/connect-platforms?connected=${platform}`);

    } catch (error) {
      console.error(`❌ OAuth callback error for ${platform}:`, error);
      return res.redirect(`/connect-platforms?error=${platform}`);
    }
  }

  /**
   * Handle OAuth failure
   */
  static handleFailure(req: Request, res: Response, platform: string, error?: string) {
    console.error(`❌ OAuth failure for ${platform}:`, error);
    return res.redirect(`/connect-platforms?error=${platform}&reason=${error || 'unknown'}`);
  }

  /**
   * Validate OAuth state to prevent CSRF
   */
  static validateState(req: Request, expectedState: string): boolean {
    const receivedState = req.query.state as string;
    return receivedState === expectedState;
  }
}

export default OAuthCallbackHandler;