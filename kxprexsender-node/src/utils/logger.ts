import winston from 'winston';

const { combine, timestamp, printf, colorize, errors } = winston.format;

const customFormat = printf(({ level, message, timestamp, stack, ...metadata }) => {
  let msg = `${timestamp} [${level}]: ${message}`;
  if (Object.keys(metadata).length > 0) {
    msg += ` ${JSON.stringify(metadata)}`;
  }
  if (stack) {
    msg += `\n${stack}`;
  }
  return msg;
});

export class Logger {
  private static instances: Map<string, winston.Logger> = new Map();
  private static defaultLogger: winston.Logger | null = null;

  private constructor() {}

  private static getDefaultLogger(): winston.Logger {
    if (!this.defaultLogger) {
      this.defaultLogger = this.createDefaultLogger();
    }
    return this.defaultLogger;
  }

  private static createDefaultLogger(name?: string): winston.Logger {
    const transports: winston.transport[] = [
      new winston.transports.Console({
        format: combine(
          colorize(),
          timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
          customFormat
        ),
      }),
    ];

    if (process.env.LOG_FILE) {
      transports.push(
        new winston.transports.File({
          filename: process.env.LOG_FILE,
          format: combine(timestamp(), winston.format.json()),
        })
      );
    }

    const logger = winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: combine(
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        errors({ stack: true }),
        winston.format.json()
      ),
      defaultMeta: { service: name || 'kxprexsender' },
      transports,
    });

    return logger;
  }

  static getLogger(name: string): winston.Logger {
    if (!this.instances.has(name)) {
      this.instances.set(name, this.createDefaultLogger(name));
    }
    return this.instances.get(name)!;
  }

  static info(message: string, meta?: Record<string, any>): void {
    this.getDefaultLogger().info(message, meta);
  }

  static error(message: string, meta?: Record<string, any>): void {
    this.getDefaultLogger().error(message, meta);
  }

  static warn(message: string, meta?: Record<string, any>): void {
    this.getDefaultLogger().warn(message, meta);
  }

  static debug(message: string, meta?: Record<string, any>): void {
    this.getDefaultLogger().debug(message, meta);
  }

  static verbose(message: string, meta?: Record<string, any>): void {
    this.getDefaultLogger().verbose(message, meta);
  }

  static createChildLogger(parent: string, child: string): winston.Logger {
    return this.getLogger(`${parent}:${child}`);
  }

  static async flush(): Promise<void> {
    return new Promise((resolve) => {
      this.getDefaultLogger().on('finish', resolve);
      this.getDefaultLogger().end();
    });
  }
}
