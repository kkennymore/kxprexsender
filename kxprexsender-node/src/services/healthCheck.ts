import { EventEmitter } from 'events';
import Redis from 'ioredis';
import { Pool } from 'pg';
import { Logger } from '../utils/logger';

export interface HealthCheckConfig {
  path?: string;
  verbose?: boolean;
  dependencies?: {
    redis?: { host?: string; port?: number; password?: string };
    postgres?: { connectionString?: string };
    fcm?: { enabled: boolean };
    webPush?: { enabled: boolean };
  };
}

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  version: string;
  checks: Record<string, CheckResult>;
  summary: {
    total: number;
    healthy: number;
    degraded: number;
    unhealthy: number;
  };
}

export interface CheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  message?: string;
  latencyMs: number;
  details?: Record<string, any>;
}

export type HealthCheckCallback = (status: HealthStatus) => void;

export class HealthCheckService extends EventEmitter {
  private config: Required<HealthCheckConfig>;
  private redisClient: Redis | null = null;
  private postgresPool: Pool | null = null;
  private startTime: number;
  private version: string = '2.0.0';
  private checkInterval: NodeJS.Timeout | null = null;
  private readonly logger = Logger.getLogger('HealthCheckService');
  private lastStatus: HealthStatus | null = null;

  constructor(config: HealthCheckConfig = {}) {
    super();
    this.config = {
      path: config.path || '/health',
      verbose: config.verbose ?? false,
      dependencies: config.dependencies || {},
    };
    this.startTime = Date.now();
  }

  async initialize(): Promise<void> {
    if (this.config.dependencies?.redis?.host) {
      try {
        this.redisClient = new Redis({
          host: this.config.dependencies.redis.host,
          port: this.config.dependencies.redis.port || 6379,
          password: this.config.dependencies.redis.password || undefined,
          maxRetriesPerRequest: 1,
          lazyConnect: true,
        });
        await this.redisClient.connect();
        this.logger.info('Health check Redis client initialized');
      } catch (error: any) {
        this.logger.warn('Health check Redis initialization failed', {
          error: error.message,
        });
      }
    }

    if (this.config.dependencies?.postgres?.connectionString) {
      try {
        this.postgresPool = new Pool({
          connectionString: this.config.dependencies.postgres.connectionString,
          max: 2,
          idleTimeoutMillis: 10000,
          connectionTimeoutMillis: 5000,
        });
        await this.postgresPool.query('SELECT 1');
        this.logger.info('Health check PostgreSQL pool initialized');
      } catch (error: any) {
        this.logger.warn('Health check PostgreSQL initialization failed', {
          error: error.message,
        });
      }
    }

    this.startPeriodicChecks();
  }

  private startPeriodicChecks(): void {
    this.checkInterval = setInterval(async () => {
      const status = await this.checkAll();
      this.lastStatus = status;
      this.emit('check', status);

      if (status.status === 'unhealthy') {
        this.logger.warn('Health check failed', { status });
      }
    }, 30000);
  }

  async checkAll(): Promise<HealthStatus> {
    const checks: Record<string, CheckResult> = {};
    let healthy = 0;
    let degraded = 0;
    let unhealthy = 0;

    const checkMethods = [
      'checkMemory',
      'checkRedis',
      'checkPostgres',
      'checkFCM',
      'checkWebPush',
      'checkDisk',
    ];

    for (const method of checkMethods) {
      const startTime = Date.now();
      try {
        const result = await (this as any)[method]();
        checks[method.replace('check', '').toLowerCase()] = {
          ...result,
          latencyMs: Date.now() - startTime,
        };

        if (result.status === 'healthy') healthy++;
        else if (result.status === 'degraded') degraded++;
        else unhealthy++;
      } catch (error: any) {
        checks[method.replace('check', '').toLowerCase()] = {
          status: 'unhealthy',
          message: error.message,
          latencyMs: Date.now() - startTime,
        };
        unhealthy++;
      }
    }

    let overallStatus: 'healthy' | 'degraded' | 'unhealthy';
    if (unhealthy > 0) {
      overallStatus = 'unhealthy';
    } else if (degraded > 0) {
      overallStatus = 'degraded';
    } else {
      overallStatus = 'healthy';
    }

    const status: HealthStatus = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
      version: this.version,
      checks,
      summary: {
        total: checkMethods.length,
        healthy,
        degraded,
        unhealthy,
      },
    };

    return status;
  }

  private async checkMemory(): Promise<CheckResult> {
    const used = process.memoryUsage();
    const heapUsed = used.heapUsed / 1024 / 1024;
    const heapTotal = used.heapTotal / 1024 / 1024;
    const percentUsed = (heapUsed / heapTotal) * 100;

    const details = {
      heapUsedMB: Math.round(heapUsed * 100) / 100,
      heapTotalMB: Math.round(heapTotal * 100) / 100,
      percentUsed: Math.round(percentUsed * 100) / 100,
      rssMB: Math.round(used.rss / 1024 / 1024 * 100) / 100,
      externalMB: Math.round(used.external / 1024 / 1024 * 100) / 100,
    };

    if (percentUsed > 95) {
      return {
        status: 'unhealthy',
        message: 'Memory usage critical',
        details,
      };
    }

    if (percentUsed > 85) {
      return {
        status: 'degraded',
        message: 'Memory usage high',
        details,
      };
    }

    return {
      status: 'healthy',
      details,
    };
  }

  private async checkRedis(): Promise<CheckResult> {
    if (!this.redisClient) {
      return {
        status: 'degraded',
        message: 'Redis not configured',
      };
    }

    try {
      const start = Date.now();
      const pong = await this.redisClient.ping();
      const latency = Date.now() - start;

      if (pong !== 'PONG') {
        return {
          status: 'unhealthy',
          message: 'Redis responded incorrectly',
          details: { response: pong },
        };
      }

      const info = await this.redisClient.info('memory');
      const usedMemory = info.match(/used_memory:(\d+)/)?.[1];

      return {
        status: 'healthy',
        details: {
          latencyMs: latency,
          memoryUsedMB: usedMemory
            ? Math.round(parseInt(usedMemory) / 1024 / 1024 * 100) / 100
            : null,
        },
      };
    } catch (error: any) {
      return {
        status: 'unhealthy',
        message: error.message,
      };
    }
  }

  private async checkPostgres(): Promise<CheckResult> {
    if (!this.postgresPool) {
      return {
        status: 'degraded',
        message: 'PostgreSQL not configured',
      };
    }

    try {
      const start = Date.now();
      const result = await this.postgresPool.query('SELECT 1 as check');
      const latency = Date.now() - start;

      const poolStats = {
        totalCount: this.postgresPool.totalCount,
        idleCount: this.postgresPool.idleCount,
        waitingCount: this.postgresPool.waitingCount,
      };

      if (poolStats.waitingCount > 5) {
        return {
          status: 'degraded',
          message: 'PostgreSQL pool waiting',
          details: { ...poolStats, latencyMs: latency },
        };
      }

      return {
        status: 'healthy',
        details: { ...poolStats, latencyMs: latency },
      };
    } catch (error: any) {
      return {
        status: 'unhealthy',
        message: error.message,
      };
    }
  }

  private async checkFCM(): Promise<CheckResult> {
    if (!this.config.dependencies?.fcm?.enabled) {
      return {
        status: 'degraded',
        message: 'FCM not configured',
      };
    }

    return {
      status: 'healthy',
      details: {
        configured: true,
        endpoint: 'https://fcm.googleapis.com',
      },
    };
  }

  private async checkWebPush(): Promise<CheckResult> {
    if (!this.config.dependencies?.webPush?.enabled) {
      return {
        status: 'degraded',
        message: 'Web Push not configured',
      };
    }

    return {
      status: 'healthy',
      details: {
        configured: true,
        vapidEnabled: true,
      },
    };
  }

  private async checkDisk(): Promise<CheckResult> {
    try {
      const stats = await import('fs').then((fs) =>
        fs.statfsSync('/')
      );
      const total = stats.bsize * stats.blocks;
      const available = stats.bsize * stats.bavail;
      const used = total - available;
      const percentUsed = (used / total) * 100;

      const details = {
        totalGB: Math.round(total / 1024 / 1024 / 1024 * 100) / 100,
        availableGB: Math.round(available / 1024 / 1024 / 1024 * 100) / 100,
        usedGB: Math.round(used / 1024 / 1024 / 1024 * 100) / 100,
        percentUsed: Math.round(percentUsed * 100) / 100,
      };

      if (percentUsed > 95) {
        return {
          status: 'unhealthy',
          message: 'Disk space critical',
          details,
        };
      }

      if (percentUsed > 85) {
        return {
          status: 'degraded',
          message: 'Disk space warning',
          details,
        };
      }

      return {
        status: 'healthy',
        details,
      };
    } catch (error: any) {
      return {
        status: 'degraded',
        message: 'Could not check disk space',
        details: { error: error.message },
      };
    }
  }

  getHealthCheckHandler(): (req: any, res: any) => Promise<void> {
    return async (req, res) => {
      const status = await this.checkAll();

      const statusCode =
        status.status === 'healthy'
          ? 200
          : status.status === 'degraded'
          ? 200
          : 503;

      res.status(statusCode).json(status);
    };
  }

  getLivenessHandler(): (req: any, res: any) => void {
    return (req, res) => {
      res.status(200).json({ status: 'alive', timestamp: new Date().toISOString() });
    };
  }

  getReadinessHandler(): (req: any, res: any) => Promise<void> {
    return async (req, res) => {
      const status = await this.checkAll();

      if (status.status === 'unhealthy') {
        res.status(503).json({ status: 'not ready', checks: status.checks });
      } else {
        res.status(200).json({ status: 'ready', checks: status.checks });
      }
    };
  }

  getLastStatus(): HealthStatus | null {
    return this.lastStatus;
  }

  setVersion(version: string): void {
    this.version = version;
  }

  getConfig(): { path: string; verbose: boolean } {
    return {
      path: this.config.path,
      verbose: this.config.verbose,
    };
  }

  shutdown(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }
    if (this.redisClient) {
      this.redisClient.quit();
    }
    if (this.postgresPool) {
      this.postgresPool.end();
    }
  }
}

export const healthCheckService = new HealthCheckService();
