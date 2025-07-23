/**
 * Public Access Manager
 * Handles public access and session establishment for gift certificate redemption
 */

import { storage } from "../storage";

export class PublicAccessManager {
  
  /**
   * Creates a guest session with limited access
   */
  static async createGuestSession(req: any): Promise<{
    sessionId: string;
    guestAccess: boolean;
    allowedFeatures: string[];
  }> {
    // Create guest session with temporary user ID
    req.session.userId = 'guest_' + Date.now();
    req.session.guestMode = true;
    req.session.guestAccess = true;
    req.session.allowedFeatures = [
      'view_platform_connections',
      'gift_certificate_redemption',
      'public_content_viewing'
    ];
    
    // Save session
    return new Promise((resolve, reject) => {
      req.session.save((err: any) => {
        if (err) {
          console.error('Guest session creation failed:', err);
          reject(err);
        } else {
          resolve({
            sessionId: req.sessionID,
            guestAccess: true,
            allowedFeatures: req.session.allowedFeatures
          });
        }
      });
    });
  }
  
  /**
   * Establishes authenticated session for gift certificate user
   */
  static async establishGiftCertificateSession(
    req: any, 
    certificateCode: string
  ): Promise<{
    success: boolean;
    sessionId?: string;
    userId?: number;
    subscriptionPlan?: string;
    error?: string;
  }> {
    try {
      // Validate gift certificate
      const certificate = await storage.getGiftCertificate(certificateCode);
      
      if (!certificate) {
        return {
          success: false,
          error: 'Gift certificate not found'
        };
      }
      
      if (certificate.isUsed) {
        return {
          success: false,
          error: 'Gift certificate already redeemed'
        };
      }
      
      // Create or get user from certificate
      let user;
      if (certificate.redeemedBy) {
        user = await storage.getUser(certificate.redeemedBy);
      } else {
        // Create new user from certificate
        user = await storage.createUser({
          email: certificate.createdFor,
          subscriptionPlan: certificate.plan,
          giftCertificateCode: certificateCode,
          isActive: true
        });
        
        // Mark certificate as redeemed
        await storage.redeemGiftCertificate(certificateCode, user.id);
      }
      
      // Establish authenticated session
      req.session.userId = user.id;
      req.session.userEmail = user.email;
      req.session.subscriptionPlan = user.subscriptionPlan;
      req.session.giftCertificateAccess = true;
      
      return new Promise((resolve, reject) => {
        req.session.save((err: any) => {
          if (err) {
            console.error('Gift certificate session creation failed:', err);
            reject(err);
          } else {
            resolve({
              success: true,
              sessionId: req.sessionID,
              userId: user.id,
              subscriptionPlan: user.subscriptionPlan
            });
          }
        });
      });
      
    } catch (error) {
      console.error('Gift certificate session establishment failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Session establishment failed'
      };
    }
  }
  
  /**
   * Checks if path should have public access
   */
  static isPublicPath(path: string): boolean {
    const publicPaths = [
      '/',
      '/public',
      '/health',
      '/manifest.json',
      '/favicon.ico',
      '/api/establish-session',
      '/api/public/',
      '/api/onboarding/',
      '/api/oauth/',
      '/auth/',
      '/api/video/',
      '/api/verify-email',
      '/auth-error',
      '/dist/',
      '/assets/',
      '/attached_assets/'
    ];
    
    return publicPaths.some(publicPath => 
      path === publicPath || path.startsWith(publicPath)
    );
  }
}

export default PublicAccessManager;