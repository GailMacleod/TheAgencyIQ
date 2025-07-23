// Enhanced Session Authentication Middleware
// Eliminates hardcoded user IDs and integrates with express-session

import { logger } from '../utils/logger.js';

class SessionAuthMiddleware {
  constructor() {
    this.validSessionFormats = /^aiq_[a-z0-9]+_[a-z0-9]+$/;
  }

  // Extract user ID from authenticated session only
  extractUserFromSession(req) {
    // Check for proper session with user ID
    if (!req.session || !req.session.userId) {
      return null;
    }

    // Validate session ID format
    if (!req.sessionID || !this.validSessionFormats.test(req.sessionID)) {
      logger.security('Invalid session format detected', {
        sessionId: req.sessionID?.substring(0, 10) + '...',
        path: req.path,
        ip: req.ip
      });
      return null;
    }

    return {
      userId: req.session.userId,
      sessionId: req.sessionID,
      email: req.session.userEmail,
      isAuthenticated: true
    };
  }

  // Require authenticated session middleware
  requireAuthenticatedSession() {
    return (req, res, next) => {
      const userSession = this.extractUserFromSession(req);
      
      if (!userSession) {
        logger.security('Unauthenticated session access attempt', {
          path: req.path,
          method: req.method,
          sessionId: req.sessionID?.substring(0, 10) + '...',
          ip: req.ip,
          userAgent: req.get('User-Agent')
        });

        return res.status(401).json({
          error: 'Authentication required',
          code: 'SESSION_AUTH_REQUIRED',
          message: 'Valid authenticated session required',
          timestamp: new Date().toISOString()
        });
      }

      // Attach user info to request
      req.authenticatedUser = userSession;
      
      logger.info('Session authentication successful', {
        userId: userSession.userId,
        sessionId: userSession.sessionId.substring(0, 10) + '...',
        path: req.path
      });

      next();
    };
  }

  // Session regeneration for security
  async regenerateSession(req, newUserData) {
    return new Promise((resolve, reject) => {
      req.session.regenerate((err) => {
        if (err) {
          logger.error('Session regeneration failed', {
            error: err.message,
            userId: newUserData.userId
          });
          reject(err);
          return;
        }

        // Set new session data
        req.session.userId = newUserData.userId;
        req.session.userEmail = newUserData.email;
        req.session.establishedAt = new Date().toISOString();
        req.session.lastActivity = new Date().toISOString();

        req.session.save((saveErr) => {
          if (saveErr) {
            logger.error('Session save failed after regeneration', {
              error: saveErr.message,
              userId: newUserData.userId
            });
            reject(saveErr);
            return;
          }

          logger.info('Session regenerated successfully', {
            userId: newUserData.userId,
            sessionId: req.sessionID.substring(0, 10) + '...',
            email: newUserData.email
          });

          resolve(req.sessionID);
        });
      });
    });
  }

  // Environment-based session establishment for scripts
  establishSessionFromEnv() {
    const envUserId = process.env.AUTHENTICATED_USER_ID;
    const envUserEmail = process.env.AUTHENTICATED_USER_EMAIL;
    const envSessionId = process.env.SESSION_ID;

    if (!envUserId || !envUserEmail || !envSessionId) {
      throw new Error('Missing required environment variables: AUTHENTICATED_USER_ID, AUTHENTICATED_USER_EMAIL, SESSION_ID');
    }

    // Validate session ID format
    if (!this.validSessionFormats.test(envSessionId)) {
      throw new Error('Invalid SESSION_ID format. Must match aiq_xxx_xxx pattern');
    }

    logger.info('Environment session establishment', {
      userId: envUserId,
      sessionId: envSessionId.substring(0, 10) + '...',
      email: envUserEmail
    });

    return {
      userId: envUserId,
      userEmail: envUserEmail,
      sessionId: envSessionId,
      establishedAt: new Date().toISOString(),
      source: 'environment'
    };
  }

  // Update session activity
  updateSessionActivity(req) {
    if (req.session && req.session.userId) {
      req.session.lastActivity = new Date().toISOString();
      req.session.touch();
      
      logger.debug('Session activity updated', {
        userId: req.session.userId,
        sessionId: req.sessionID?.substring(0, 10) + '...'
      });
    }
  }

  // Validate session integrity
  validateSessionIntegrity(req) {
    if (!req.session || !req.sessionID) {
      return { valid: false, reason: 'No session found' };
    }

    if (!req.session.userId) {
      return { valid: false, reason: 'No user ID in session' };
    }

    if (!this.validSessionFormats.test(req.sessionID)) {
      return { valid: false, reason: 'Invalid session ID format' };
    }

    // Check session age (optional - for additional security)
    if (req.session.establishedAt) {
      const sessionAge = Date.now() - new Date(req.session.establishedAt).getTime();
      const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days
      
      if (sessionAge > maxAge) {
        return { valid: false, reason: 'Session expired' };
      }
    }

    return { 
      valid: true, 
      userId: req.session.userId,
      sessionId: req.sessionID,
      email: req.session.userEmail
    };
  }
}

// Singleton instance for consistent session management
const sessionAuthMiddleware = new SessionAuthMiddleware();

export {
  SessionAuthMiddleware,
  sessionAuthMiddleware
};