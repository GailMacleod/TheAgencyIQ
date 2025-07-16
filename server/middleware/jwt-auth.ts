/**
 * JWT Authentication Middleware
 * Handles authentication for Replit iframe environment
 */

// import jwt from 'jsonwebtoken'; // Temporarily disabled
import { Request, Response, NextFunction } from 'express';
import { storage } from '../storage';

interface JWTPayload {
  userId: number;
  userEmail: string;
  exp: number;
  iat: number;
}

export class JWTAuthMiddleware {
  private static JWT_SECRET = process.env.JWT_SECRET || 'theagencyiq-jwt-secret-key';
  private static JWT_EXPIRES_IN = '7d';

  /**
   * Generate JWT token for user (simplified version)
   */
  static generateToken(userId: number, userEmail: string): string {
    try {
      // For now, create a simple token format
      const payload = {
        userId,
        userEmail,
        exp: Date.now() + (7 * 24 * 60 * 60 * 1000), // 7 days
        iat: Date.now()
      };
      
      // Simple base64 encoding (temporary solution)
      return Buffer.from(JSON.stringify(payload)).toString('base64');
    } catch (error) {
      console.error('JWT generation error:', error);
      throw new Error('Failed to generate authentication token');
    }
  }

  /**
   * Verify JWT token (simplified version)
   */
  static verifyToken(token: string): JWTPayload | null {
    try {
      // Simple base64 decoding (temporary solution)
      const decoded = JSON.parse(Buffer.from(token, 'base64').toString('utf-8'));
      
      // Check if token is expired
      if (decoded.exp < Date.now()) {
        console.log('Token expired');
        return null;
      }
      
      return decoded as JWTPayload;
    } catch (error) {
      console.error('JWT verification error:', error);
      return null;
    }
  }

  /**
   * Authentication middleware
   */
  static authenticate = async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Extract token from multiple sources
      let token: string | null = null;

      // 1. Authorization header
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      }

      // 2. Query parameter (for iframe compatibility)
      if (!token && req.query.auth_token) {
        token = req.query.auth_token as string;
      }

      // 3. Cookie (fallback)
      if (!token && req.cookies.auth_token) {
        token = req.cookies.auth_token;
      }

      if (!token) {
        return res.status(401).json({
          error: 'Authentication required',
          message: 'No authentication token provided',
          redirectTo: '/login'
        });
      }

      // Verify token
      const decoded = this.verifyToken(token);
      if (!decoded) {
        return res.status(401).json({
          error: 'Invalid token',
          message: 'Authentication token is invalid or expired',
          redirectTo: '/login'
        });
      }

      // Verify user exists
      const user = await storage.getUser(decoded.userId);
      if (!user) {
        return res.status(401).json({
          error: 'User not found',
          message: 'User associated with token does not exist',
          redirectTo: '/login'
        });
      }

      // Add user to request
      (req as any).user = user;
      (req as any).userId = decoded.userId;
      (req as any).userEmail = decoded.userEmail;

      next();
    } catch (error) {
      console.error('Authentication middleware error:', error);
      return res.status(500).json({
        error: 'Authentication error',
        message: 'Internal server error during authentication'
      });
    }
  }

  /**
   * Generate authentication response with token
   */
  static generateAuthResponse(userId: number, userEmail: string): {
    token: string;
    expiresIn: string;
    tokenType: string;
  } {
    const token = this.generateToken(userId, userEmail);
    
    return {
      token,
      expiresIn: this.JWT_EXPIRES_IN,
      tokenType: 'Bearer'
    };
  }

  /**
   * Set authentication cookie (for iframe support)
   */
  static setAuthCookie(res: Response, token: string): void {
    res.cookie('auth_token', token, {
      httpOnly: false, // Allow frontend access
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' as const : 'lax' as const,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/'
    });
  }

  /**
   * Clear authentication cookie
   */
  static clearAuthCookie(res: Response): void {
    res.clearCookie('auth_token', {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' as const : 'lax' as const,
      path: '/'
    });
  }

  /**
   * Refresh token middleware
   */
  static refreshToken = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).userId;
      const userEmail = (req as any).userEmail;

      if (!userId || !userEmail) {
        return res.status(401).json({
          error: 'Invalid token data',
          message: 'Token missing required user information'
        });
      }

      // Generate new token
      const authResponse = this.generateAuthResponse(userId, userEmail);
      
      // Set new cookie
      this.setAuthCookie(res, authResponse.token);

      // Add to response headers
      res.setHeader('X-New-Token', authResponse.token);

      next();
    } catch (error) {
      console.error('Token refresh error:', error);
      return res.status(500).json({
        error: 'Token refresh failed',
        message: 'Unable to refresh authentication token'
      });
    }
  }
}