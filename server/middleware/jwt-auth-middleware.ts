import { Request, Response, NextFunction } from 'express';
import { jwtSessionManager } from '../services/jwt-session-manager';

interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    email: string;
    sessionId: string;
  };
}

export const jwtAuthMiddleware = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      res.status(401).json({ 
        error: 'No token provided',
        message: 'Authentication required' 
      });
      return;
    }

    const sessionData = await jwtSessionManager.validateSession(token);
    
    if (!sessionData) {
      res.status(401).json({ 
        error: 'Invalid token',
        message: 'Authentication required' 
      });
      return;
    }

    // Add user data to request
    req.user = {
      id: sessionData.userId,
      email: sessionData.email,
      sessionId: sessionData.sessionId
    };

    next();
  } catch (error) {
    console.error('JWT auth middleware error:', error);
    res.status(500).json({ 
      error: 'Authentication error',
      message: 'Internal server error' 
    });
  }
};

// Middleware to require specific user (for single-user restriction)
export const requireSpecificUser = (allowedUserId: number = 2) => {
  return async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      // First apply JWT authentication
      await jwtAuthMiddleware(req, res, () => {});
      
      if (!req.user) {
        return;
      }

      // Check if user is the allowed user
      if (req.user.id !== allowedUserId) {
        res.status(403).json({ 
          error: 'Access denied',
          message: 'This system is restricted to authorized users only' 
        });
        return;
      }

      next();
    } catch (error) {
      console.error('User restriction middleware error:', error);
      res.status(500).json({ 
        error: 'Authorization error',
        message: 'Internal server error' 
      });
    }
  };
};

// Optional JWT middleware (doesn't block if no token)
export const optionalJwtAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (token) {
      const sessionData = await jwtSessionManager.validateSession(token);
      
      if (sessionData) {
        req.user = {
          id: sessionData.userId,
          email: sessionData.email,
          sessionId: sessionData.sessionId
        };
      }
    }

    next();
  } catch (error) {
    console.error('Optional JWT auth error:', error);
    // Don't block request on error, just continue without user
    next();
  }
};

// Middleware to refresh token if needed
export const tokenRefreshMiddleware = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      next();
      return;
    }

    // Try to refresh token if it's close to expiry
    const newToken = await jwtSessionManager.refreshSession(token);
    
    if (newToken && newToken !== token) {
      // Set new token in response header
      res.setHeader('X-New-Token', newToken);
    }

    next();
  } catch (error) {
    console.error('Token refresh middleware error:', error);
    next();
  }
};

export default jwtAuthMiddleware;