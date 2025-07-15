/**
 * Memory Management Middleware
 * Implements memory monitoring and cleanup for production use
 */

import { Request, Response, NextFunction } from 'express';
import { MemoryMonitor } from '../utils/memory-optimized-cache';

const memoryMonitor = MemoryMonitor.getInstance();

// Track request count to trigger cleanup
let requestCount = 0;
const CLEANUP_INTERVAL = 100; // Run cleanup every 100 requests

export const memoryMiddleware = (req: Request, res: Response, next: NextFunction) => {
  requestCount++;
  
  // Add memory usage to request for monitoring
  const memoryUsage = process.memoryUsage();
  req.memoryUsage = {
    rss: Math.round(memoryUsage.rss / 1024 / 1024 * 100) / 100, // MB
    heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024 * 100) / 100,
    heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024 * 100) / 100
  };
  
  // Log memory usage for high-memory requests
  if (memoryUsage.rss > 300 * 1024 * 1024) { // 300MB threshold
    console.log(`⚠️ High memory request: ${req.method} ${req.path} - ${req.memoryUsage.rss}MB`);
  }
  
  // Trigger cleanup periodically
  if (requestCount % CLEANUP_INTERVAL === 0) {
    setImmediate(() => {
      if (global.gc) {
        global.gc();
        console.log(`🗑️ Garbage collection triggered after ${requestCount} requests`);
      }
    });
  }
  
  next();
};

// Memory cleanup middleware for response
export const memoryCleanupMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Monitor response size
  const originalSend = res.send;
  res.send = function(body: any) {
    if (body && typeof body === 'string' && body.length > 1024 * 1024) { // 1MB response
      console.log(`📦 Large response: ${req.method} ${req.path} - ${Math.round(body.length / 1024)}KB`);
    }
    return originalSend.call(this, body);
  };
  
  // Monitor response time
  const startTime = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    if (duration > 1000) { // Slow requests
      console.log(`🐌 Slow request: ${req.method} ${req.path} - ${duration}ms`);
    }
  });
  
  next();
};

// Request timeout middleware
export const requestTimeoutMiddleware = (timeout: number = 30000) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const timer = setTimeout(() => {
      if (!res.headersSent) {
        console.log(`⏱️ Request timeout: ${req.method} ${req.path}`);
        res.status(408).json({ error: 'Request timeout' });
      }
    }, timeout);
    
    res.on('finish', () => {
      clearTimeout(timer);
    });
    
    next();
  };
};

// Rate limiting middleware
export const rateLimitMiddleware = (maxRequests: number = 100, windowMs: number = 60000) => {
  const clients = new Map<string, { count: number; resetTime: number }>();
  
  return (req: Request, res: Response, next: NextFunction) => {
    const clientKey = req.ip || 'unknown';
    const now = Date.now();
    
    let client = clients.get(clientKey);
    if (!client || now > client.resetTime) {
      client = { count: 0, resetTime: now + windowMs };
      clients.set(clientKey, client);
    }
    
    client.count++;
    
    if (client.count > maxRequests) {
      return res.status(429).json({ error: 'Rate limit exceeded' });
    }
    
    // Cleanup old entries
    if (clients.size > 1000) {
      for (const [key, value] of clients.entries()) {
        if (now > value.resetTime) {
          clients.delete(key);
        }
      }
    }
    
    next();
  };
};

// High memory usage alert
memoryMonitor.onHighMemory((usage) => {
  console.error(`🚨 HIGH MEMORY USAGE: ${Math.round(usage.rss / 1024 / 1024)}MB`);
  console.error(`   Heap Used: ${Math.round(usage.heapUsed / 1024 / 1024)}MB`);
  console.error(`   External: ${Math.round(usage.external / 1024 / 1024)}MB`);
});

declare global {
  namespace Express {
    interface Request {
      memoryUsage?: {
        rss: number;
        heapUsed: number;
        heapTotal: number;
      };
    }
  }
}