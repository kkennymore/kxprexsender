import { RateLimiterMemory, RateLimiterRedis } from 'rate-limiter-flexible';
import Redis from 'ioredis';
import { Logger } from '../utils/logger';

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  keyPrefix?: string;
  redis?: {
    host?: string;
    port?: number;
    password?: string;
  };
  blockDuration?: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
  retryAfter?: number;
}

export class RateLimiterService {
  private limiter: RateLimiterMemory | RateLimiterRedis;
  private useRedis: boolean = false;
  private config: Required<RateLimitConfig>;
  private readonly logger = Logger.getLogger('RateLimiterService');

  constructor(config: RateLimitConfig) {
    this.config = {
      windowMs: config.windowMs || 60000,
      maxRequests: config.maxRequests || 100,
      keyPrefix: config.keyPrefix || 'kxprex:ratelimit:',
      blockDuration: config.blockDuration || 0,
      redis: config.redis || {},
    };

    if (this.config.redis?.host) {
      try {
        const redis = new Redis({
          host: this.config.redis.host,
          port: this.config.redis.port || 6379,
          password: this.config.redis.password || undefined,
        });
        this.limiter = new RateLimiterRedis({
          storeClient: redis,
          points: this.config.maxRequests,
          duration: this.config.windowMs / 1000,
          blockDuration: this.config.blockDuration,
          keyPrefix: this.config.keyPrefix,
        });
        this.useRedis = true;
        this.logger.info('Rate limiter using Redis');
      } catch (error: any) {
        this.logger.warn('Redis connection failed, using memory rate limiter', {
          error: error.message,
        });
        this.useRedis = false;
      }
    }

    if (!this.useRedis) {
      this.limiter = new RateLimiterMemory({
        points: this.config.maxRequests,
        duration: this.config.windowMs / 1000,
        blockDuration: this.config.blockDuration,
      });
      this.logger.info('Rate limiter using memory');
    }
  }

  async checkLimit(key: string): Promise<RateLimitResult> {
    try {
      const limiterKey = this.config.keyPrefix + key;
      const result = await this.limiter.get(limiterKey);

      if (result !== null) {
        const remaining = this.config.maxRequests - result.consumedPoints;
        const resetAt = new Date(
          Date.now() + (this.config.windowMs - result.msBeforeNext)
        );

        return {
          allowed: remaining > 0,
          remaining: Math.max(0, remaining),
          resetAt,
          retryAfter: result.msBeforeNext > 0 ? Math.ceil(result.msBeforeNext / 1000) : undefined,
        };
      }

      return {
        allowed: true,
        remaining: this.config.maxRequests,
        resetAt: new Date(Date.now() + this.config.windowMs),
      };
    } catch (error: any) {
      this.logger.error('Rate limit check error', { key, error: error.message });
      return {
        allowed: true,
        remaining: this.config.maxRequests,
        resetAt: new Date(Date.now() + this.config.windowMs),
      };
    }
  }

  async consume(key: string, points: number = 1): Promise<RateLimitResult> {
    try {
      const limiterKey = this.config.keyPrefix + key;
      const result = await this.limiter.consume(limiterKey, points);

      const remaining = this.config.maxRequests - result.consumedPoints;
      const resetAt = new Date(
        Date.now() + (this.config.windowMs - result.msBeforeNext)
      );

      return {
        allowed: remaining >= 0,
        remaining: Math.max(0, remaining),
        resetAt,
        retryAfter:
          result.msBeforeNext > 0
            ? Math.ceil(result.msBeforeNext / 1000)
            : undefined,
      };
    } catch (error: any) {
      if (error instanceof Error && error.name === 'RateLimiterError') {
        const retryAfter = Math.ceil((error as any).msBeforeNext / 1000);
        return {
          allowed: false,
          remaining: 0,
          resetAt: new Date(Date.now() + (error as any).msBeforeNext),
          retryAfter,
        };
      }

      this.logger.error('Rate limit consume error', { key, error: error.message });
      return {
        allowed: true,
        remaining: this.config.maxRequests,
        resetAt: new Date(Date.now() + this.config.windowMs),
      };
    }
  }

  async block(key: string, durationMs: number = 60000): Promise<void> {
    try {
      const limiterKey = this.config.keyPrefix + 'blocked:' + key;
      await this.limiter.block(limiterKey, durationMs / 1000);
      this.logger.info('Rate limit blocked', { key, durationMs });
    } catch (error: any) {
      this.logger.error('Rate limit block error', { key, error: error.message });
    }
  }

  async unblock(key: string): Promise<void> {
    try {
      const limiterKey = this.config.keyPrefix + 'blocked:' + key;
      await this.limiter.delete(limiterKey);
      this.logger.info('Rate limit unblocked', { key });
    } catch (error: any) {
      this.logger.error('Rate limit unblock error', { key, error: error.message });
    }
  }

  async getRemainingRequests(key: string): Promise<number> {
    const result = await this.checkLimit(key);
    return result.remaining;
  }

  async reset(key: string): Promise<void> {
    try {
      const limiterKey = this.config.keyPrefix + key;
      await this.limiter.delete(limiterKey);
      this.logger.info('Rate limit reset', { key });
    } catch (error: any) {
      this.logger.error('Rate limit reset error', { key, error: error.message });
    }
  }

  getConfig(): {
    windowMs: number;
    maxRequests: number;
    type: string;
  } {
    return {
      windowMs: this.config.windowMs,
      maxRequests: this.config.maxRequests,
      type: this.useRedis ? 'redis' : 'memory',
    };
  }
}

export const createRateLimiter = (config: RateLimitConfig): RateLimiterService => {
  return new RateLimiterService(config);
};
