import { Logger } from '../utils/logger';

export interface PoolConfig {
  minSize?: number;
  maxSize?: number;
  acquireTimeout?: number;
  idleTimeout?: number;
  maxUses?: number;
}

export interface PooledConnection<T> {
  id: string;
  connection: T;
  createdAt: Date;
  lastUsedAt: Date;
  uses: number;
  isValid: boolean;
}

export type ConnectionFactory<T> = () => Promise<T>;
export type ConnectionValidator<T> = (connection: T) => Promise<boolean>;
export type ConnectionCloser<T> = (connection: T) => Promise<void>;

export class ConnectionPool<T> {
  private pool: Map<string, PooledConnection<T>> = new Map();
  private waitingQueue: Array<{
    id: string;
    resolve: (connection: T) => void;
    reject: (error: Error) => void;
    timeout: NodeJS.Timeout;
  }> = [];
  private config: Required<PoolConfig>;
  private factory: ConnectionFactory<T>;
  private validator?: ConnectionValidator<T>;
  private closer?: ConnectionCloser<T>;
  private readonly logger = Logger.getLogger('ConnectionPool');
  private creating: Set<string> = new Set();
  private closed: boolean = false;

  constructor(
    factory: ConnectionFactory<T>,
    config?: PoolConfig,
    validator?: ConnectionValidator<T>,
    closer?: ConnectionCloser<T>
  ) {
    this.factory = factory;
    this.validator = validator;
    this.closer = closer;
    this.config = {
      minSize: config?.minSize ?? 2,
      maxSize: config?.maxSize ?? 10,
      acquireTimeout: config?.acquireTimeout ?? 30000,
      idleTimeout: config?.idleTimeout ?? 60000,
      maxUses: config?.maxUses ?? 1000,
    };
  }

  async acquire(): Promise<T> {
    if (this.closed) {
      throw new Error('Connection pool is closed');
    }

    const now = Date.now();

    for (const [id, conn] of this.pool.entries()) {
      if (this.isConnectionValid(conn, now)) {
        this.pool.delete(id);

        conn.lastUsedAt = new Date();
        conn.uses++;

        this.logger.debug('Reusing connection', { id, uses: conn.uses });

        this.createMinConnections();
        return conn.connection;
      } else {
        await this.destroyConnection(id, conn);
      }
    }

    if (this.pool.size + this.creating.size < this.config.maxSize) {
      return this.createNewConnection();
    }

    return this.waitForConnection();
  }

  private async createNewConnection(): Promise<T> {
    const id = `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.creating.add(id);

    try {
      this.logger.debug('Creating new connection', { id });
      const connection = await this.factory();

      const pooled: PooledConnection<T> = {
        id,
        connection,
        createdAt: new Date(),
        lastUsedAt: new Date(),
        uses: 0,
        isValid: true,
      };

      this.creating.delete(id);
      this.pool.set(id, pooled);

      this.logger.info('Connection created', { id });

      this.createMinConnections();
      return connection;
    } catch (error: any) {
      this.creating.delete(id);
      this.logger.error('Failed to create connection', { id, error: error.message });
      throw error;
    }
  }

  private async waitForConnection(): Promise<T> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        const index = this.waitingQueue.findIndex((w) => w.id === waiter.id);
        if (index !== -1) {
          this.waitingQueue.splice(index, 1);
        }
        reject(new Error('Connection acquire timeout'));
      }, this.config.acquireTimeout);

      const waiter = {
        id: `wait_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        resolve: (conn: T) => {
          clearTimeout(timeout);
          const index = this.waitingQueue.findIndex((w) => w.id === waiter.id);
          if (index !== -1) {
            this.waitingQueue.splice(index, 1);
          }
          resolve(conn);
        },
        reject,
        timeout,
      };

      this.waitingQueue.push(waiter);
    });
  }

  private isConnectionValid(conn: PooledConnection<T>, now: number): boolean {
    if (!conn.isValid) return false;
    if (conn.uses >= this.config.maxUses) return false;
    if (now - conn.lastUsedAt.getTime() > this.config.idleTimeout) return false;
    return true;
  }

  async release(connection: T): Promise<void> {
    if (this.closed) {
      await this.destroyConnectionByConnection(connection);
      return;
    }

    const conn = Array.from(this.pool.values()).find(
      (c) => c.connection === connection
    );

    if (!conn) {
      this.logger.warn('Releasing unknown connection');
      return;
    }

    if (this.waitingQueue.length > 0) {
      const waiter = this.waitingQueue.shift()!;
      waiter.resolve(connection);
      return;
    }

    if (this.pool.size < this.config.maxSize) {
      conn.lastUsedAt = new Date();
      this.logger.debug('Connection released to pool', { id: conn.id });
    } else {
      await this.destroyConnection(conn.id, conn);
    }
  }

  async destroy(id: string): Promise<boolean> {
    const conn = this.pool.get(id);
    if (!conn) return false;

    return this.destroyConnection(id, conn);
  }

  private async destroyConnection(
    id: string,
    conn: PooledConnection<T>
  ): Promise<boolean> {
    this.pool.delete(id);

    try {
      if (this.closer) {
        await this.closer(conn.connection);
      }
      this.logger.info('Connection destroyed', { id });
      return true;
    } catch (error: any) {
      this.logger.error('Error destroying connection', { id, error: error.message });
      return false;
    }
  }

  private async destroyConnectionByConnection(connection: T): Promise<boolean> {
    const entry = Array.from(this.pool.entries()).find(
      ([_, c]) => c.connection === connection
    );

    if (!entry) return false;

    return this.destroyConnection(entry[0], entry[1]);
  }

  private async createMinConnections(): Promise<void> {
    const needed = this.config.minSize - this.pool.size;
    if (needed <= 0) return;

    const currentCreating = this.creating.size;
    const toCreate = Math.min(needed, this.config.maxSize - this.pool.size - currentCreating);

    for (let i = 0; i < toCreate; i++) {
      this.createNewConnection().catch(() => {});
    }
  }

  async warmup(): Promise<void> {
    if (this.closed) return;

    this.logger.info('Warming up connection pool', { minSize: this.config.minSize });

    const promises = [];
    for (let i = 0; i < this.config.minSize; i++) {
      promises.push(this.acquire().catch(() => null));
    }

    const connections = await Promise.all(promises);

    for (const conn of connections) {
      if (conn) {
        await this.release(conn);
      }
    }

    this.logger.info('Connection pool warmed up', { connections: connections.filter(Boolean).length });
  }

  async close(): Promise<void> {
    this.closed = true;

    for (const waiter of this.waitingQueue) {
      clearTimeout(waiter.timeout);
      waiter.reject(new Error('Connection pool is closing'));
    }
    this.waitingQueue = [];

    const connections = Array.from(this.pool.values());
    this.pool.clear();

    await Promise.all(
      connections.map((c) =>
        this.destroyConnection(c.id, c).catch(() => {})
      )
    );

    this.logger.info('Connection pool closed');
  }

  async validate(connection: T): Promise<boolean> {
    if (this.validator) {
      return this.validator(connection);
    }
    return true;
  }

  getStats(): {
    size: number;
    available: number;
    waiting: number;
    creating: number;
    config: PoolConfig;
  } {
    return {
      size: this.pool.size,
      available: this.pool.size,
      waiting: this.waitingQueue.length,
      creating: this.creating.size,
      config: this.config,
    };
  }

  getPool(): Map<string, PooledConnection<T>> {
    return new Map(this.pool);
  }
}

export const createConnectionPool = <T>(
  factory: ConnectionFactory<T>,
  config?: PoolConfig,
  validator?: ConnectionValidator<T>,
  closer?: ConnectionCloser<T>
): ConnectionPool<T> => {
  return new ConnectionPool(factory, config, validator, closer);
};
