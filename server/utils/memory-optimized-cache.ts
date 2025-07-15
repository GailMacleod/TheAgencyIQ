/**
 * Memory-Optimized Cache System
 * Implements LRU cache with TTL and size limits for production use
 */

export class LRUCache<T = any> {
  private cache: Map<string, T>;
  private timers: Map<string, NodeJS.Timeout>;
  private accessOrder: string[];
  private maxSize: number;
  private ttl: number;

  constructor(maxSize: number = 100, ttl: number = 30000) {
    this.maxSize = maxSize;
    this.ttl = ttl;
    this.cache = new Map();
    this.timers = new Map();
    this.accessOrder = [];
  }

  get(key: string): T | undefined {
    const item = this.cache.get(key);
    if (!item) return undefined;

    // Update access order (move to end)
    this.updateAccessOrder(key);
    return item;
  }

  set(key: string, value: T): void {
    // Remove oldest if at capacity
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      this.evictOldest();
    }

    // Clear existing timer
    this.clearTimer(key);

    // Set new value
    this.cache.set(key, value);
    this.updateAccessOrder(key);

    // Set expiration timer
    const timer = setTimeout(() => {
      this.delete(key);
    }, this.ttl);
    this.timers.set(key, timer);
  }

  delete(key: string): boolean {
    this.clearTimer(key);
    this.removeFromAccessOrder(key);
    return this.cache.delete(key);
  }

  clear(): void {
    this.timers.forEach(timer => clearTimeout(timer));
    this.cache.clear();
    this.timers.clear();
    this.accessOrder = [];
  }

  size(): number {
    return this.cache.size;
  }

  has(key: string): boolean {
    return this.cache.has(key);
  }

  private updateAccessOrder(key: string): void {
    this.removeFromAccessOrder(key);
    this.accessOrder.push(key);
  }

  private removeFromAccessOrder(key: string): void {
    const index = this.accessOrder.indexOf(key);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
    }
  }

  private evictOldest(): void {
    if (this.accessOrder.length > 0) {
      const oldestKey = this.accessOrder[0];
      this.delete(oldestKey);
    }
  }

  private clearTimer(key: string): void {
    const timer = this.timers.get(key);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(key);
    }
  }

  // Memory usage stats
  getStats(): { size: number; maxSize: number; hitRate: number } {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hitRate: 0 // Could be implemented with hit/miss counters
    };
  }
}

// Session store optimization
export class OptimizedSessionStore {
  private sessions: Map<string, any>;
  private cleanupInterval: NodeJS.Timeout;
  private maxSessions: number;
  private sessionTTL: number;

  constructor(maxSessions: number = 1000, sessionTTL: number = 24 * 60 * 60 * 1000) {
    this.sessions = new Map();
    this.maxSessions = maxSessions;
    this.sessionTTL = sessionTTL;
    
    // Cleanup expired sessions every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);
  }

  private cleanup(): void {
    const now = Date.now();
    let cleanedCount = 0;
    
    for (const [sessionId, session] of this.sessions) {
      if (session.expires && session.expires < now) {
        this.sessions.delete(sessionId);
        cleanedCount++;
      }
    }
    
    // If still too many sessions, remove oldest
    if (this.sessions.size > this.maxSessions) {
      const sortedSessions = Array.from(this.sessions.entries())
        .sort((a, b) => (a[1].lastAccess || 0) - (b[1].lastAccess || 0));
      
      const toRemove = this.sessions.size - this.maxSessions;
      for (let i = 0; i < toRemove; i++) {
        this.sessions.delete(sortedSessions[i][0]);
        cleanedCount++;
      }
    }
    
    if (cleanedCount > 0) {
      console.log(`🧹 Cleaned ${cleanedCount} expired sessions`);
    }
  }

  get(sessionId: string): any {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.lastAccess = Date.now();
    }
    return session;
  }

  set(sessionId: string, session: any): void {
    session.lastAccess = Date.now();
    session.expires = Date.now() + this.sessionTTL;
    this.sessions.set(sessionId, session);
  }

  delete(sessionId: string): boolean {
    return this.sessions.delete(sessionId);
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.sessions.clear();
  }

  size(): number {
    return this.sessions.size;
  }
}

// Memory monitoring utility
export class MemoryMonitor {
  private static instance: MemoryMonitor;
  private checkInterval: NodeJS.Timeout;
  private memoryThreshold: number;
  private callbacks: Array<(usage: NodeJS.MemoryUsage) => void>;

  constructor(threshold: number = 400) { // 400MB threshold
    this.memoryThreshold = threshold * 1024 * 1024; // Convert to bytes
    this.callbacks = [];
    
    // Check memory every 30 seconds
    this.checkInterval = setInterval(() => {
      this.checkMemory();
    }, 30000);
  }

  static getInstance(): MemoryMonitor {
    if (!MemoryMonitor.instance) {
      MemoryMonitor.instance = new MemoryMonitor();
    }
    return MemoryMonitor.instance;
  }

  private checkMemory(): void {
    const usage = process.memoryUsage();
    
    if (usage.rss > this.memoryThreshold) {
      console.warn(`⚠️ Memory usage high: ${Math.round(usage.rss / 1024 / 1024)}MB`);
      
      // Trigger callbacks
      this.callbacks.forEach(callback => {
        try {
          callback(usage);
        } catch (error) {
          console.error('Memory callback error:', error);
        }
      });
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
        console.log('🗑️ Garbage collection triggered');
      }
    }
  }

  onHighMemory(callback: (usage: NodeJS.MemoryUsage) => void): void {
    this.callbacks.push(callback);
  }

  getUsage(): NodeJS.MemoryUsage {
    return process.memoryUsage();
  }

  destroy(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }
    this.callbacks = [];
  }
}

// Stream processing utility for large responses
export class StreamProcessor {
  static createJSONStream(data: any[]): NodeJS.ReadableStream {
    const stream = new (require('stream').Readable)({ objectMode: true });
    let index = 0;
    
    stream._read = () => {
      if (index < data.length) {
        stream.push(JSON.stringify(data[index]));
        index++;
      } else {
        stream.push(null); // End of stream
      }
    };
    
    return stream;
  }

  static async processInChunks<T>(
    data: T[],
    chunkSize: number,
    processor: (chunk: T[]) => Promise<void>
  ): Promise<void> {
    for (let i = 0; i < data.length; i += chunkSize) {
      const chunk = data.slice(i, i + chunkSize);
      await processor(chunk);
      
      // Allow other operations to run
      await new Promise(resolve => setImmediate(resolve));
    }
  }
}