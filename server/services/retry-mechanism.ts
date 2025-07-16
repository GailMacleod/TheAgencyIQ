/**
 * Retry Mechanism with Exponential Backoff
 * Handles retries for failed API calls with smart error categorization
 */

interface RetryConfig {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  retryableErrors: string[];
}

interface RetryResult<T> {
  success: boolean;
  data?: T;
  error?: Error;
  attempts: number;
  totalTime: number;
}

export class RetryMechanism {
  private static platformConfigs: Record<string, RetryConfig> = {
    facebook: {
      maxAttempts: 5,
      baseDelay: 60, // 1 minute
      maxDelay: 3600, // 1 hour
      backoffMultiplier: 2,
      retryableErrors: [
        'rate_limit',
        'network_error',
        'timeout',
        'server_error',
        'quota_exceeded'
      ]
    },
    instagram: {
      maxAttempts: 5,
      baseDelay: 120, // 2 minutes
      maxDelay: 7200, // 2 hours
      backoffMultiplier: 1.5,
      retryableErrors: [
        'rate_limit',
        'network_error',
        'timeout',
        'server_error',
        'quota_exceeded'
      ]
    },
    linkedin: {
      maxAttempts: 3,
      baseDelay: 300, // 5 minutes
      maxDelay: 3600, // 1 hour
      backoffMultiplier: 2,
      retryableErrors: [
        'rate_limit',
        'network_error',
        'timeout',
        'server_error'
      ]
    },
    twitter: {
      maxAttempts: 8,
      baseDelay: 60, // 1 minute
      maxDelay: 1800, // 30 minutes
      backoffMultiplier: 2,
      retryableErrors: [
        'rate_limit',
        'network_error',
        'timeout',
        'server_error',
        'quota_exceeded'
      ]
    },
    youtube: {
      maxAttempts: 3,
      baseDelay: 600, // 10 minutes
      maxDelay: 21600, // 6 hours
      backoffMultiplier: 1.5,
      retryableErrors: [
        'rate_limit',
        'network_error',
        'timeout',
        'server_error'
      ]
    }
  };

  /**
   * Execute function with retry logic
   */
  static async executeWithRetry<T>(
    operation: () => Promise<T>,
    platform: string,
    context: string = 'operation'
  ): Promise<RetryResult<T>> {
    const config = this.platformConfigs[platform] || this.platformConfigs.facebook;
    const startTime = Date.now();
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
      try {
        console.log(`🔄 Attempt ${attempt}/${config.maxAttempts} for ${platform} ${context}`);
        
        const result = await operation();
        
        console.log(`✅ ${platform} ${context} succeeded on attempt ${attempt}`);
        return {
          success: true,
          data: result,
          attempts: attempt,
          totalTime: Date.now() - startTime
        };

      } catch (error) {
        lastError = error as Error;
        console.error(`❌ ${platform} ${context} failed on attempt ${attempt}:`, error);

        // Check if error is retryable
        const errorType = this.categorizeError(error as Error);
        if (!config.retryableErrors.includes(errorType)) {
          console.log(`🚫 Non-retryable error (${errorType}), stopping retries`);
          break;
        }

        // Don't wait after the last attempt
        if (attempt === config.maxAttempts) {
          break;
        }

        // Calculate delay with exponential backoff
        const delay = Math.min(
          config.baseDelay * Math.pow(config.backoffMultiplier, attempt - 1),
          config.maxDelay
        );

        console.log(`⏰ Waiting ${delay}s before retry ${attempt + 1}/${config.maxAttempts}`);
        await this.delay(delay * 1000);
      }
    }

    return {
      success: false,
      error: lastError || new Error('Unknown error'),
      attempts: config.maxAttempts,
      totalTime: Date.now() - startTime
    };
  }

  /**
   * Execute multiple operations with retry logic
   */
  static async executeMultipleWithRetry<T>(
    operations: Array<{
      operation: () => Promise<T>;
      platform: string;
      context: string;
    }>
  ): Promise<Array<RetryResult<T>>> {
    const results: Array<RetryResult<T>> = [];

    for (const { operation, platform, context } of operations) {
      const result = await this.executeWithRetry(operation, platform, context);
      results.push(result);
    }

    return results;
  }

  /**
   * Categorize error for retry decision
   */
  private static categorizeError(error: Error): string {
    const message = error.message.toLowerCase();
    
    // Rate limiting errors
    if (message.includes('rate limit') || message.includes('too many requests')) {
      return 'rate_limit';
    }
    
    // Quota exceeded errors
    if (message.includes('quota') || message.includes('limit exceeded')) {
      return 'quota_exceeded';
    }
    
    // Authentication errors (usually non-retryable)
    if (message.includes('unauthorized') || message.includes('invalid token') || 
        message.includes('access denied') || message.includes('authentication')) {
      return 'auth_error';
    }
    
    // Network errors
    if (message.includes('network') || message.includes('connection') || 
        message.includes('timeout') || message.includes('econnrefused')) {
      return 'network_error';
    }
    
    // Server errors
    if (message.includes('server error') || message.includes('internal error') || 
        message.includes('service unavailable')) {
      return 'server_error';
    }
    
    // Client errors (usually non-retryable)
    if (message.includes('bad request') || message.includes('invalid') || 
        message.includes('malformed')) {
      return 'client_error';
    }
    
    // Default to server error (retryable)
    return 'server_error';
  }

  /**
   * Delay helper function
   */
  private static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Check if error is retryable for platform
   */
  static isRetryable(error: Error, platform: string): boolean {
    const config = this.platformConfigs[platform] || this.platformConfigs.facebook;
    const errorType = this.categorizeError(error);
    return config.retryableErrors.includes(errorType);
  }

  /**
   * Calculate next retry time
   */
  static getNextRetryTime(attempt: number, platform: string): Date {
    const config = this.platformConfigs[platform] || this.platformConfigs.facebook;
    const delay = Math.min(
      config.baseDelay * Math.pow(config.backoffMultiplier, attempt - 1),
      config.maxDelay
    );
    return new Date(Date.now() + delay * 1000);
  }

  /**
   * Get retry configuration for platform
   */
  static getRetryConfig(platform: string): RetryConfig {
    return this.platformConfigs[platform] || this.platformConfigs.facebook;
  }

  /**
   * Update retry configuration for platform
   */
  static updateRetryConfig(platform: string, config: Partial<RetryConfig>): void {
    this.platformConfigs[platform] = {
      ...this.platformConfigs[platform],
      ...config
    };
  }
}

/**
 * Decorator for automatic retry
 */
export function retryOnFailure(platform: string, context: string = 'method') {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const result = await RetryMechanism.executeWithRetry(
        () => originalMethod.apply(this, args),
        platform,
        context
      );

      if (result.success) {
        return result.data;
      } else {
        throw result.error;
      }
    };

    return descriptor;
  };
}

/**
 * Utility functions for common retry patterns
 */
export class RetryUtilities {
  /**
   * Retry HTTP request with exponential backoff
   */
  static async retryHttpRequest<T>(
    requestFn: () => Promise<T>,
    platform: string,
    context: string = 'http_request'
  ): Promise<T> {
    const result = await RetryMechanism.executeWithRetry(
      requestFn,
      platform,
      context
    );

    if (result.success) {
      return result.data as T;
    } else {
      throw result.error;
    }
  }

  /**
   * Retry database operation
   */
  static async retryDatabaseOperation<T>(
    operation: () => Promise<T>,
    maxAttempts: number = 3
  ): Promise<T> {
    const result = await RetryMechanism.executeWithRetry(
      operation,
      'database',
      'db_operation'
    );

    if (result.success) {
      return result.data as T;
    } else {
      throw result.error;
    }
  }

  /**
   * Retry with jitter to avoid thundering herd
   */
  static async retryWithJitter<T>(
    operation: () => Promise<T>,
    platform: string,
    jitterPercent: number = 0.1
  ): Promise<T> {
    const config = RetryMechanism.getRetryConfig(platform);
    const originalBaseDelay = config.baseDelay;
    
    // Add jitter to base delay
    const jitter = originalBaseDelay * jitterPercent * (Math.random() - 0.5);
    config.baseDelay = originalBaseDelay + jitter;

    try {
      const result = await RetryMechanism.executeWithRetry(
        operation,
        platform,
        'jittered_operation'
      );

      if (result.success) {
        return result.data as T;
      } else {
        throw result.error;
      }
    } finally {
      // Restore original base delay
      config.baseDelay = originalBaseDelay;
    }
  }
}