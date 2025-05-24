export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3
}

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: Date;
  context?: Record<string, any>;
  error?: Error;
}

export class Logger {
  private static instance: Logger;
  private logLevel: LogLevel = LogLevel.INFO;
  private context: Record<string, any> = {};

  private constructor() {
    // Set log level based on environment
    const envLevel = process.env.LOG_LEVEL?.toUpperCase();
    switch (envLevel) {
      case 'ERROR':
        this.logLevel = LogLevel.ERROR;
        break;
      case 'WARN':
        this.logLevel = LogLevel.WARN;
        break;
      case 'INFO':
        this.logLevel = LogLevel.INFO;
        break;
      case 'DEBUG':
        this.logLevel = LogLevel.DEBUG;
        break;
      default:
        this.logLevel = process.env.NODE_ENV === 'production' ? LogLevel.INFO : LogLevel.DEBUG;
    }
  }

  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  public static create(context: Record<string, any> = {}): Logger {
    const logger = Logger.getInstance();
    const childLogger = Object.create(logger);
    childLogger.context = { ...logger.context, ...context };
    return childLogger;
  }

  public setContext(context: Record<string, any>): Logger {
    this.context = { ...this.context, ...context };
    return this;
  }

  public error(message: string, error?: Error, context?: Record<string, any>): void {
    this.log(LogLevel.ERROR, message, { ...this.context, ...context }, error);
  }

  public warn(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.WARN, message, { ...this.context, ...context });
  }

  public info(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.INFO, message, { ...this.context, ...context });
  }

  public debug(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.DEBUG, message, { ...this.context, ...context });
  }

  private log(level: LogLevel, message: string, context?: Record<string, any>, error?: Error): void {
    if (level > this.logLevel) {
      return;
    }

    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date(),
      context,
      error
    };

    this.writeLog(entry);
  }

  private writeLog(entry: LogEntry): void {
    const timestamp = entry.timestamp.toISOString();
    const levelName = LogLevel[entry.level];
    const contextStr = entry.context ? ` ${JSON.stringify(entry.context)}` : '';
    const errorStr = entry.error ? ` Error: ${entry.error.message}\n${entry.error.stack}` : '';
    
    const logMessage = `[${timestamp}] ${levelName}: ${entry.message}${contextStr}${errorStr}`;

    // In production, you might want to send logs to external service
    switch (entry.level) {
      case LogLevel.ERROR:
        console.error(logMessage);
        break;
      case LogLevel.WARN:
        console.warn(logMessage);
        break;
      case LogLevel.INFO:
        console.info(logMessage);
        break;
      case LogLevel.DEBUG:
        console.debug(logMessage);
        break;
    }
  }
}

// Global logger instance
export const logger = Logger.getInstance();