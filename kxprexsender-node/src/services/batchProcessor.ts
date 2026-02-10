import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import { Logger } from '../utils/logger';
import { metricsService } from './metrics';

export interface BatchOptions {
  maxBatchSize: number;
  flushInterval: number;
  maxRetries: number;
  priorityLevels?: number;
}

export interface BatchItem<T> {
  id: string;
  data: T;
  priority: number;
  attempts: number;
  createdAt: Date;
  lastAttempt?: Date;
  error?: string;
}

export interface BatchResult<T> {
  id: string;
  items: T[];
  processed: number;
  successful: number;
  failed: number;
  duration: number;
  errors?: { item: T; error: string }[];
}

export type BatchProcessorHandler<T> = (
  items: T[]
) => Promise<{ successful: T[]; failed: { item: T; error: string }[] }>;

export class BatchProcessor<T> extends EventEmitter {
  private queue: BatchItem<T>[] = [];
  private processing: Set<string> = new Set();
  private flushInterval: NodeJS.Timeout | null = null;
  private config: Required<BatchOptions>;
  private readonly logger = Logger.getLogger('BatchProcessor');
  private isProcessing: boolean = false;
  private paused: boolean = false;

  constructor(options: BatchOptions) {
    super();
    this.config = {
      maxBatchSize: options.maxBatchSize || 100,
      flushInterval: options.flushInterval || 5000,
      maxRetries: options.maxRetries || 3,
      priorityLevels: options.priorityLevels || 5,
    };
  }

  start(): void {
    if (this.flushInterval) return;

    this.flushInterval = setInterval(() => {
      this.flush();
    }, this.config.flushInterval);

    this.logger.info('Batch processor started', { config: this.config });
  }

  stop(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }

    this.logger.info('Batch processor stopped');
  }

  add(data: T, priority: number = 0): string {
    const item: BatchItem<T> = {
      id: uuidv4(),
      data,
      priority: Math.min(Math.max(priority, 0), this.config.priorityLevels),
      attempts: 0,
      createdAt: new Date(),
    };

    const insertIndex = this.findInsertIndex(item);
    this.queue.splice(insertIndex, 0, item);

    metricsService.incrementCounter('batch_items_added_total', { priority: String(priority) });

    if (this.queue.length >= this.config.maxBatchSize) {
      this.flush();
    }

    return item.id;
  }

  private findInsertIndex(item: BatchItem<T>): number {
    for (let i = 0; i < this.queue.length; i++) {
      if (this.queue[i].priority < item.priority) {
        return i;
      }
    }
    return this.queue.length;
  }

  async flush(): Promise<void> {
    if (this.isProcessing || this.queue.length === 0 || this.paused) {
      return;
    }

    this.isProcessing = true;
    const startTime = Date.now();

    const itemsToProcess = this.queue.splice(0, this.config.maxBatchSize);
    const itemIds = new Set(itemsToProcess.map((i) => i.id));

    for (const item of itemsToProcess) {
      this.processing.add(item.id);
    }

    this.logger.info('Flushing batch', { count: itemsToProcess.length });

    try {
      const result = await this.processItems(itemsToProcess);

      for (const item of itemsToProcess) {
        this.processing.delete(item.id);
      }

      const duration = Date.now() - startTime;

      metricsService.incrementCounter('batch_flush_total');
      metricsService.observeHistogram('batch_flush_duration_seconds', duration / 1000);

      this.emit('flush', {
        processed: result.successful.length + result.failed.length,
        successful: result.successful.length,
        failed: result.failed.length,
        duration,
      });

      if (result.failed.length > 0) {
        await this.handleFailures(result.failed, itemsToProcess);
      }
    } catch (error: any) {
      this.logger.error('Batch flush error', { error: error.message });

      for (const item of itemsToProcess) {
        this.processing.delete(item.id);
      }

      itemsToProcess.forEach((item) => {
        item.attempts++;
        item.error = error.message;
        this.queue.unshift(item);
      });
    } finally {
      this.isProcessing = false;
    }
  }

  private async processItems(items: BatchItem<T[]>): Promise<{
    successful: T[];
    failed: { item: T; error: string }[];
  }> {
    if (items.length === 0) {
      return { successful: [], failed: [] };
    }

    const successful: T[] = [];
    const failed: { item: T; error: string }[] = [];

    try {
      const handler = this.getHandler();
      const result = await handler(items.map((i) => i.data));

      successful.push(...result.successful);
      failed.push(...result.failed);
    } catch (error: any) {
      for (const item of items) {
        failed.push({ item: item.data, error: error.message });
      }
    }

    return { successful, failed };
  }

  private async handleFailures(
    failedItems: { item: T; error: string }[],
    originalItems: BatchItem<T>[]
  ): Promise<void> {
    for (const { item, error } of failedItems) {
      const original = originalItems.find((i) => i.data === item);
      if (!original) continue;

      original.attempts++;
      original.error = error;
      original.lastAttempt = new Date();

      metricsService.incrementCounter('batch_item_failed_total', {
        attempts: String(original.attempts),
      });

      if (original.attempts < this.config.maxRetries) {
        const retryDelay = Math.pow(2, original.attempts) * 1000;
        setTimeout(() => {
          this.queue.unshift(original);
        }, retryDelay);
      } else {
        this.logger.warn('Item exceeded max retries', {
          id: original.id,
          attempts: original.attempts,
        });

        metricsService.incrementCounter('batch_item_dropped_total');

        this.emit('dropped', { item: original.data, error });
      }
    }
  }

  private handler: BatchProcessorHandler<T> | null = null;

  setHandler(handler: BatchProcessorHandler<T>): void {
    this.handler = handler;
  }

  private getHandler(): BatchProcessorHandler<T> {
    if (!this.handler) {
      throw new Error('Batch handler not set');
    }
    return this.handler;
  }

  pause(): void {
    this.paused = true;
    this.logger.info('Batch processor paused');
  }

  resume(): void {
    this.paused = false;
    this.logger.info('Batch processor resumed');
    this.flush();
  }

  getQueueSize(): number {
    return this.queue.length;
  }

  getProcessingSize(): number {
    return this.processing.size;
  }

  getStats(): {
    queueSize: number;
    processingSize: number;
    paused: boolean;
    config: BatchOptions;
  } {
    return {
      queueSize: this.queue.length,
      processingSize: this.processing.size,
      paused: this.paused,
      config: this.config,
    };
  }

  clear(): void {
    const cleared = this.queue.length;
    this.queue = [];
    this.logger.info('Batch processor cleared', { cleared });
  }

  async shutdown(): Promise<void> {
    this.stop();

    while (this.queue.length > 0 || this.isProcessing) {
      await this.flush();
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
}

export const createBatchProcessor = <T>(options: BatchOptions): BatchProcessor<T> => {
  return new BatchProcessor<T>(options);
};
