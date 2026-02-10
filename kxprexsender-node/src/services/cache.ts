import Redis from 'ioredis';
import { Logger } from '../utils/logger';

export interface CacheConfig {
  provider: 'redis' | 'memory';
  host?: string;
  port?: number;
  password?: string;
  db?: number;
  keyPrefix?: string;
  ttl?: number;
  maxSize?: number;
}

export interface CacheEntry<T> {
  value: T;
  expiresAt?: number;
}

export class CacheService {
  private redis: Redis | null = null;
  private memoryCache: Map<string, CacheEntry<any>> = new Map();
  private config: Required<CacheConfig>;
  private isRedis: boolean = false;
  private readonly logger = Logger.getLogger('CacheService');

  constructor(config: CacheConfig) {
    this.config = {
      provider: config.provider || 'memory',
      host: config.host || 'localhost',
      port: config.port || 6379,
      password: config.password || '',
      db: config.db || 0,
      keyPrefix: config.keyPrefix || 'kxprex:',
      ttl: config.ttl || 3600,
      maxSize: config.maxSize || 10000,
    };
  }

  async connect(): Promise<void> {
    if (this.config.provider === 'redis') {
      try {
        this.redis = new Redis({
          host: this.config.host,
          port: this.config.port,
          password: this.config.password || undefined,
          db: this.config.db,
          retryStrategy: (times) => {
            const delay = Math.min(times * 50, 2000);
            return delay;
          },
          maxRetriesPerRequest: 3,
        });

        this.redis.on('connect', () => {
          this.logger.info('Redis connected');
        });

        this.redis.on('error', (error) => {
          this.logger.error('Redis error', { error: error.message });
          this.isRedis = false;
        });

        this.isRedis = true;
        await this.redis.ping();
        this.logger.info('Cache service connected to Redis');
      } catch (error: any) {
        this.logger.warn('Redis connection failed, falling back to memory', {
          error: error.message,
        });
        this.isRedis = false;
      }
    }
  }

  async disconnect(): Promise<void> {
    if (this.redis) {
      await this.redis.quit();
      this.redis = null;
      this.isRedis = false;
      this.logger.info('Redis disconnected');
    }
  }

  private getKey(key: string): string {
    return `${this.config.keyPrefix}${key}`;
  }

  private cleanupMemory(): void {
    if (this.memoryCache.size > this.config.maxSize * 0.9) {
      const now = Date.now();
      for (const [key, entry] of this.memoryCache.entries()) {
        if (entry.expiresAt && now > entry.expiresAt) {
          this.memoryCache.delete(key);
        }
      }
      if (this.memoryCache.size > this.config.maxSize) {
        const entries = Array.from(this.memoryCache.entries());
        for (let i = 0; i < entries.length * 0.2; i++) {
          this.memoryCache.delete(entries[i][0]);
        }
      }
    }
  }

  async get<T>(key: string): Promise<T | null> {
    const cacheKey = this.getKey(key);

    if (this.isRedis && this.redis) {
      try {
        const value = await this.redis.get(cacheKey);
        if (value) {
          return JSON.parse(value) as T;
        }
      } catch (error: any) {
        this.logger.error('Cache get error', { key, error: error.message });
      }
      return null;
    }

    this.cleanupMemory();
    const entry = this.memoryCache.get(cacheKey);
    if (!entry) return null;

    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.memoryCache.delete(cacheKey);
      return null;
    }

    return entry.value as T;
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    const cacheKey = this.getKey(key);
    const expiry = ttl || this.config.ttl;
    const entry: CacheEntry<T> = {
      value,
      expiresAt: Date.now() + expiry * 1000,
    };

    if (this.isRedis && this.redis) {
      try {
        await this.redis.setex(cacheKey, expiry, JSON.stringify(value));
      } catch (error: any) {
        this.logger.error('Cache set error', { key, error: error.message });
      }
      return;
    }

    this.cleanupMemory();
    this.memoryCache.set(cacheKey, entry);
  }

  async delete(key: string): Promise<void> {
    const cacheKey = this.getKey(key);

    if (this.isRedis && this.redis) {
      try {
        await this.redis.del(cacheKey);
      } catch (error: any) {
        this.logger.error('Cache delete error', { key, error: error.message });
      }
      return;
    }

    this.memoryCache.delete(cacheKey);
  }

  async invalidate(pattern: string): Promise<void> {
    const patternKey = this.getKey(pattern);

    if (this.isRedis && this.redis) {
      try {
        const keys = await this.redis.keys(patternKey);
        if (keys.length > 0) {
          await this.redis.del(...keys);
        }
      } catch (error: any) {
        this.logger.error('Cache invalidate pattern error', {
          pattern,
          error: error.message,
        });
      }
      return;
    }

    const regex = new RegExp(patternKey.replace('*', '.*'));
    for (const key of this.memoryCache.keys()) {
      if (regex.test(key)) {
        this.memoryCache.delete(key);
      }
    }
  }

  async clear(): Promise<void> {
    if (this.isRedis && this.redis) {
      try {
        const keys = await this.redis.keys(this.config.keyPrefix + '*');
        if (keys.length > 0) {
          await this.redis.del(...keys);
        }
      } catch (error: any) {
        this.logger.error('Cache clear error', { error: error.message });
      }
      return;
    }

    this.memoryCache.clear();
  }

  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const value = await factory();
    await this.set(key, value, ttl);
    return value;
  }

  async getMultiple<T>(keys: string[]): Promise<Map<string, T | null>> {
    const result = new Map<string, T | null>();

    if (this.isRedis && this.redis && keys.length > 0) {
      try {
        const redisKeys = keys.map((k) => this.getKey(k));
        const values = await this.redis.mget(...redisKeys);

        keys.forEach((key, index) => {
          result.set(key, values[index] ? JSON.parse(values[index]) : null);
        });
      } catch (error: any) {
        this.logger.error('Cache getMultiple error', { error: error.message });
      }
      return result;
    }

    for (const key of keys) {
      result.set(key, await this.get<T>(key));
    }

    return result;
  }

  async setMultiple(
    entries: Record<string, any>,
    ttl?: number
  ): Promise<void> {
    const expiry = ttl || this.config.ttl;

    if (this.isRedis && this.redis) {
      try {
        const pipeline = this.redis.pipeline();
        for (const [key, value] of Object.entries(entries)) {
          pipeline.setex(this.getKey(key), expiry, JSON.stringify(value));
        }
        await pipeline.exec();
      } catch (error: any) {
        this.logger.error('Cache setMultiple error', { error: error.message });
      }
      return;
    }

    for (const [key, value] of Object.entries(entries)) {
      await this.set(key, value, ttl);
    }
  }

  getStats(): {
    type: string;
    size: number;
    maxSize: number;
  } {
    return {
      type: this.isRedis ? 'redis' : 'memory',
      size: this.isRedis ? -1 : this.memoryCache.size,
      maxSize: this.config.maxSize,
    };
  }
}
