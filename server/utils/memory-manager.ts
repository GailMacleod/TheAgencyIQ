/**
 * Memory Management System for Production Deployment
 * Optimizes memory usage and prevents memory leaks
 */

class MemoryManager {
  private static instance: MemoryManager;
  private memoryCheckInterval: NodeJS.Timeout;
  private gcInterval: NodeJS.Timeout;
  private memoryLimit: number = 400 * 1024 * 1024; // 400MB limit for Replit
  
  private constructor() {
    this.initializeMemoryMonitoring();
    this.initializeGarbageCollection();
  }
  
  static getInstance(): MemoryManager {
    if (!MemoryManager.instance) {
      MemoryManager.instance = new MemoryManager();
    }
    return MemoryManager.instance;
  }
  
  private initializeMemoryMonitoring(): void {
    this.memoryCheckInterval = setInterval(() => {
      const memUsage = process.memoryUsage();
      
      if (memUsage.rss > this.memoryLimit) {
        console.warn(`⚠️  Memory limit exceeded: ${Math.round(memUsage.rss / 1024 / 1024)}MB`);
        this.forceGarbageCollection();
      }
      
      // Log memory usage every 30 seconds in production
      if (process.env.NODE_ENV === 'production') {
        console.log(`📊 Memory: ${Math.round(memUsage.rss / 1024 / 1024)}MB RSS, ${Math.round(memUsage.heapUsed / 1024 / 1024)}MB Heap`);
      }
    }, 30000);
  }
  
  private initializeGarbageCollection(): void {
    this.gcInterval = setInterval(() => {
      if (global.gc) {
        global.gc();
      }
    }, 60000); // Force GC every minute
  }
  
  private forceGarbageCollection(): void {
    if (global.gc) {
      global.gc();
      console.log('🗑️  Forced garbage collection');
    }
  }
  
  getMemoryUsage(): NodeJS.MemoryUsage {
    return process.memoryUsage();
  }
  
  cleanup(): void {
    if (this.memoryCheckInterval) {
      clearInterval(this.memoryCheckInterval);
    }
    if (this.gcInterval) {
      clearInterval(this.gcInterval);
    }
  }
}

export const memoryManager = MemoryManager.getInstance();