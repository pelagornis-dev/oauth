import { Request, Response, NextFunction } from 'express';
import { logger } from '../../shared/utils/logger';
import { HTTP_STATUS } from '../../shared/constants/httpStatus';
import { authConfig } from '../../infrastructure/config/auth';

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

interface RateLimitOptions {
  windowMs: number;
  maxRequests: number;
  message?: string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  keyGenerator?: (req: Request) => string;
}

export class RateLimitMiddleware {
  private store: RateLimitStore = {};
  private readonly logger = logger.setContext({ middleware: 'RateLimitMiddleware' });

  constructor() {
    // Clean up expired entries every minute
    setInterval(() => {
      this.cleanupExpiredEntries();
    }, 60000);
  }

  public createRateLimit = (options: RateLimitOptions) => {
    const {
      windowMs,
      maxRequests,
      message = 'Too many requests from this IP, please try again later.',
      skipSuccessfulRequests = false,
      skipFailedRequests = false,
      keyGenerator = (req: Request) => req.ip
    } = options;

    return (req: Request, res: Response, next: NextFunction): void => {
      try {
        const key = keyGenerator(req);
        const now = Date.now();
        const windowStart = now - windowMs;

        // Get or create rate limit record
        let record = this.store[key];
        if (!record || record.resetTime <= windowStart) {
          record = {
            count: 0,
            resetTime: now + windowMs
          };
          this.store[key] = record;
        }

        // Increment counter
        record.count++;

        // Set rate limit headers
        res.set({
          'X-RateLimit-Limit': maxRequests.toString(),
          'X-RateLimit-Remaining': Math.max(0, maxRequests - record.count).toString(),
          'X-RateLimit-Reset': new Date(record.resetTime).toISOString()
        });

        // Check if limit exceeded
        if (record.count > maxRequests) {
          this.logger.warn('Rate limit exceeded', {
            key,
            count: record.count,
            limit: maxRequests,
            path: req.path,
            method: req.method,
            userAgent: req.get('User-Agent')
          });

          const retryAfter = Math.ceil((record.resetTime - now) / 1000);
          res.set('Retry-After', retryAfter.toString());

          res.status(HTTP_STATUS.TOO_MANY_REQUESTS).json({
            success: false,
            error: {
              code: 'RATE_LIMIT_EXCEEDED',
              message,
              statusCode: HTTP_STATUS.TOO_MANY_REQUESTS,
              timestamp: new Date().toISOString(),
              retryAfter
            }
          });
          return;
        }

        this.logger.debug('Rate limit check passed', {
          key,
          count: record.count,
          limit: maxRequests,
          path: req.path
        });

        // Handle response to potentially skip counting
        if (skipSuccessfulRequests || skipFailedRequests) {
          const originalSend = res.send;
          res.send = function(body) {
            const statusCode = res.statusCode;
            const shouldSkip = 
              (skipSuccessfulRequests && statusCode < 400) ||
              (skipFailedRequests && statusCode >= 400);

            if (shouldSkip && record) {
              record.count--;
            }

            return originalSend.call(this, body);
          };
        }

        next();
      } catch (error) {
        this.logger.error('Rate limit middleware error', {
          error: error instanceof Error ? error.message : 'Unknown error',
          path: req.path
        });
        next(error);
      }
    };
  };

  // Pre-configured rate limiters
  public general = this.createRateLimit({
    windowMs: authConfig.rateLimit.windowMs,
    maxRequests: authConfig.rateLimit.max
  });

  public auth = this.createRateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5, // 5 attempts per 15 minutes
    message: 'Too many authentication attempts, please try again later.',
    skipSuccessfulRequests: true
  });

  public passwordReset = this.createRateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 3, // 3 password reset requests per hour
    message: 'Too many password reset requests, please try again later.'
  });

  public emailVerification = this.createRateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutes
    maxRequests: 3, // 3 verification emails per 5 minutes
    message: 'Too many verification email requests, please try again later.'
  });

  public api = this.createRateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 100, // 100 API calls per 15 minutes
    keyGenerator: (req: Request) => {
      // Use user ID if authenticated, otherwise fall back to IP
      return req.user?.id || req.ip;
    }
  });

  private cleanupExpiredEntries(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];

    for (const [key, record] of Object.entries(this.store)) {
      if (record.resetTime <= now) {
        expiredKeys.push(key);
      }
    }

    expiredKeys.forEach(key => {
      delete this.store[key];
    });

    if (expiredKeys.length > 0) {
      this.logger.debug('Cleaned up expired rate limit entries', {
        count: expiredKeys.length
      });
    }
  }

  // Method to manually reset rate limit for a key (useful for testing or admin operations)
  public resetRateLimit(key: string): void {
    delete this.store[key];
    this.logger.info('Rate limit manually reset', { key });
  }

  // Method to get current rate limit status for a key
  public getRateLimitStatus(key: string): { count: number; remaining: number; resetTime: Date } | null {
    const record = this.store[key];
    if (!record) {
      return null;
    }

    return {
      count: record.count,
      remaining: Math.max(0, authConfig.rateLimit.max - record.count),
      resetTime: new Date(record.resetTime)
    };
  }
}