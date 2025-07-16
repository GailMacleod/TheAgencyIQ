import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

// Simple session token management without JWT dependency
const SESSION_SECRET = process.env.SESSION_SECRET || 'your-secret-key-here';

// Rate limiter: Simple memory-based implementation
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

// Session token interface
interface SessionToken {
  userId: number;
  email: string;
  iat: number;
  exp: number;
}

// Generate session token using crypto
export function generateSessionToken(userId: number, email: string): string {
  const payload = {
    userId,
    email,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (30 * 60), // 30 minutes
  };
  
  const token = Buffer.from(JSON.stringify(payload)).toString('base64');
  const signature = crypto.createHmac('sha256', SESSION_SECRET).update(token).digest('hex');
  
  return `${token}.${signature}`;
}

// Verify session token
export function verifySessionToken(token: string): SessionToken | null {
  try {
    const [payload, signature] = token.split('.');
    const expectedSignature = crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('hex');
    
    if (signature !== expectedSignature) {
      return null;
    }
    
    const decoded = JSON.parse(Buffer.from(payload, 'base64').toString()) as SessionToken;
    
    // Check if token is expired
    if (decoded.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    
    return decoded;
  } catch (error) {
    return null;
  }
}

// Enhanced CORS middleware with proper headers
export function corsMiddleware(req: Request, res: Response, next: NextFunction) {
  // Set CORS headers for all requests
  const isDevelopment = process.env.NODE_ENV === 'development';
  const allowedOrigins = isDevelopment 
    ? ['*'] 
    : ['https://app.theagencyiq.ai', 'https://theagencyiq.ai'];
  
  const origin = req.headers.origin;
  if (isDevelopment || (origin && allowedOrigins.includes(origin))) {
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
  }
  
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Cookie');
  res.setHeader('Access-Control-Expose-Headers', 'Set-Cookie');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  next();
}

// Simple rate limiting middleware
export function rateLimitMiddleware(req: Request, res: Response, next: NextFunction) {
  const clientIp = req.ip || req.connection.remoteAddress || 'unknown';
  
  // For development, skip rate limiting
  if (process.env.NODE_ENV === 'development') {
    return next();
  }
  
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute window
  const maxRequests = 100; // 100 requests per minute
  
  const current = rateLimitMap.get(clientIp) || { count: 0, resetTime: now + windowMs };
  
  // Reset window if time passed
  if (now > current.resetTime) {
    current.count = 0;
    current.resetTime = now + windowMs;
  }
  
  // Check if over limit
  if (current.count >= maxRequests) {
    return res.status(429).json({
      error: 'Rate limit exceeded',
      message: 'Too many requests. Please try again later.',
      retryAfter: current.resetTime - now
    });
  }
  
  // Increment counter
  current.count++;
  rateLimitMap.set(clientIp, current);
  
  next();
}

// Session timeout middleware
export function sessionTimeoutMiddleware(req: any, res: Response, next: NextFunction) {
  if (!req.session) {
    return next();
  }
  
  const now = Date.now();
  const sessionTimeout = 30 * 60 * 1000; // 30 minutes
  
  // Check if session has lastActivity
  if (req.session.lastActivity) {
    const timeSinceLastActivity = now - req.session.lastActivity;
    
    if (timeSinceLastActivity > sessionTimeout) {
      // Session expired due to inactivity
      req.session.destroy((err) => {
        if (err) {
          console.error('Session destruction error:', err);
        }
      });
      
      return res.status(401).json({
        error: 'Session expired',
        message: 'Your session has expired due to inactivity. Please sign in again.',
        redirect: '/login'
      });
    }
  }
  
  // Update last activity
  req.session.lastActivity = now;
  
  next();
}

// Enhanced authentication middleware without fallback user IDs
export function enhancedAuthMiddleware(req: any, res: Response, next: NextFunction) {
  // Check for JWT token in Authorization header
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const decoded = verifySessionToken(token);
    
    if (decoded) {
      req.user = { id: decoded.userId, email: decoded.email };
      return next();
    }
  }
  
  // Check session-based authentication
  if (req.session && req.session.userId) {
    req.user = { id: req.session.userId };
    return next();
  }
  
  // No fallback user IDs - strict authentication required
  return res.status(401).json({
    error: 'Unauthorized',
    message: 'Authentication required. Please sign in.',
    redirect: '/login'
  });
}

// Session keep-alive endpoint
export function sessionKeepAlive(req: any, res: Response) {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({
      error: 'No active session',
      message: 'No active session found.'
    });
  }
  
  // Update last activity
  req.session.lastActivity = Date.now();
  
  // Generate new JWT token
  const token = generateSessionToken(req.session.userId, req.session.userEmail || '');
  
  res.json({
    success: true,
    message: 'Session refreshed',
    token,
    expiresIn: 1800 // 30 minutes
  });
}

// Session validation middleware
export function validateSession(req: any, res: Response, next: NextFunction) {
  if (!req.session) {
    return res.status(500).json({
      error: 'Session configuration error',
      message: 'Session middleware not properly configured'
    });
  }
  
  // Ensure session has required properties
  if (!req.session.id) {
    return res.status(500).json({
      error: 'Invalid session',
      message: 'Session ID missing'
    });
  }
  
  next();
}