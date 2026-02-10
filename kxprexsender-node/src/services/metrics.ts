import client, { Registry, Counter, Histogram, Gauge, collectDefaultMetrics } from 'prom-client';

export interface MetricsConfig {
  enabled?: boolean;
  prefix?: string;
  path?: string;
  collectDefaultMetrics?: boolean;
}

export class MetricsService {
  private registry: Registry;
  private config: Required<MetricsConfig>;
  private counters: Map<string, Counter<string>> = new Map();
  private histograms: Map<string, Histogram<string>> = new Map();
  private gauges: Map<string, Gauge<string>> = new Map();
  private readonly logger = require('../utils/logger').Logger.getLogger('MetricsService');

  constructor(config: MetricsConfig = {}) {
    this.config = {
      enabled: config.enabled ?? true,
      prefix: config.prefix || 'kxprex',
      path: config.path || '/metrics',
      collectDefaultMetrics: config.collectDefaultMetrics ?? true,
    };

    this.registry = new Registry();
    this.registry.setDefaultLabels({
      app: 'kxprexsender',
    });

    if (this.config.collectDefaultMetrics) {
      collectDefaultMetrics({ register: this.registry, prefix: this.config.prefix + '_' });
    }

    this.initializeMetrics();
  }

  private initializeMetrics(): void {
    this.createCounter('notifications_sent_total', 'Total notifications sent', [
      'channel',
      'type',
      'status',
    ]);

    this.createCounter('notifications_delivered_total', 'Total notifications delivered', [
      'channel',
      'platform',
    ]);

    this.createCounter('notifications_failed_total', 'Total notifications failed', [
      'channel',
      'error_type',
    ]);

    this.createHistogram('notification_delivery_latency_seconds', 'Notification delivery latency', [
      'channel',
    ], [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10]);

    this.createHistogram('notification_processing_duration_seconds', 'Notification processing duration', [
      'type',
    ], [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1]);

    this.createGauge('active_devices', 'Number of active devices', [
      'platform',
      'transport',
    ]);

    this.createGauge('active_users', 'Number of active users');

    this.createCounter('device_registrations_total', 'Total device registrations', [
      'platform',
      'transport',
      'status',
    ]);

    this.createCounter('api_requests_total', 'Total API requests', [
      'method',
      'endpoint',
      'status',
    ]);

    this.createHistogram('api_request_duration_seconds', 'API request duration', [
      'method',
      'endpoint',
    ], [0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5]);

    this.createCounter('cache_operations_total', 'Cache operations', [
      'operation',
      'status',
    ]);

    this.createCounter('rate_limit_exceeded_total', 'Rate limit exceeded', [
      'endpoint',
    ]);

    this.createGauge('cache_size', 'Cache size', ['type']);

    this.createGauge('queue_size', 'Queue size', ['queue_name']);
  }

  createCounter(
    name: string,
    help: string,
    labelNames: string[] = []
  ): Counter<string> {
    const fullName = `${this.config.prefix}_${name}`;
    const counter = new Counter({
      name: fullName,
      help,
      labelNames,
      registers: [this.registry],
    });
    this.counters.set(name, counter);
    return counter;
  }

  createHistogram(
    name: string,
    help: string,
    labelNames: string[] = [],
    buckets?: number[]
  ): Histogram<string> {
    const fullName = `${this.config.prefix}_${name}`;
    const histogram = new Histogram({
      name: fullName,
      help,
      labelNames,
      buckets: buckets ?? [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
      registers: [this.registry],
    });
    this.histograms.set(name, histogram);
    return histogram;
  }

  createGauge(name: string, help: string, labelNames: string[] = []): Gauge<string> {
    const fullName = `${this.config.prefix}_${name}`;
    const gauge = new Gauge({
      name: fullName,
      help,
      labelNames,
      registers: [this.registry],
    });
    this.gauges.set(name, gauge);
    return gauge;
  }

  incrementCounter(name: string, labels?: Record<string, string | number>): void {
    const counter = this.counters.get(name);
    if (counter) {
      const labelValues = labels ? Object.values(labels) : [];
      counter.inc(labelValues);
    }
  }

  observeHistogram(
    name: string,
    value: number,
    labels?: Record<string, string | number>
  ): void {
    const histogram = this.histograms.get(name);
    if (histogram) {
      const labelValues = labels ? Object.values(labels) : [];
      histogram.observe(labelValues, value);
    }
  }

  setGauge(name: string, value: number, labels?: Record<string, string | number>): void {
    const gauge = this.gauges.get(name);
    if (gauge) {
      const labelValues = labels ? Object.values(labels) : [];
      gauge.set(labelValues, value);
    }
  }

  incrementGauge(name: string, value: number = 1, labels?: Record<string, string | number>): void {
    const gauge = this.gauges.get(name);
    if (gauge) {
      const labelValues = labels ? Object.values(labels) : [];
      gauge.inc(labelValues, value);
    }
  }

  decrementGauge(name: string, value: number = 1, labels?: Record<string, string | number>): void {
    const gauge = this.gauges.get(name);
    if (gauge) {
      const labelValues = labels ? Object.values(labels) : [];
      gauge.dec(labelValues, value);
    }
  }

  async getMetrics(): Promise<string> {
    return this.registry.metrics();
  }

  async getMetricsContentType(): Promise<string> {
    return this.registry.contentType;
  }

  getRegistry(): Registry {
    return this.registry;
  }

  getConfig(): { enabled: boolean; path: string; prefix: string } {
    return {
      enabled: this.config.enabled,
      path: this.config.path,
      prefix: this.config.prefix,
    };
  }

  reset(): void {
    this.registry.resetMetrics();
    for (const counter of this.counters.values()) {
      counter.reset();
    }
    for (const histogram of this.histograms.values()) {
      histogram.reset();
    }
    for (const gauge of this.gauges.values()) {
      gauge.reset();
    }
  }

  static createDefault(): MetricsService {
    return new MetricsService();
  }
}

export const metricsService = MetricsService.createDefault();
