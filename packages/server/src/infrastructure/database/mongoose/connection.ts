import mongoose from 'mongoose';
import { environment } from '../../config/environment';
import { logger } from '../../../shared/utils/logger';
import { BaseError } from '../../../shared/errors/BaseError';
import { HTTP_STATUS } from '../../../shared/constants/httpStatus';

class DatabaseConnectionError extends BaseError {
  constructor(message: string, originalError?: Error) {
    super(message, HTTP_STATUS.INTERNAL_SERVER_ERROR, false, {
      originalError: originalError?.message,
      stack: originalError?.stack
    });
  }
}

export class DatabaseConnection {
  private static instance: DatabaseConnection;
  private isConnected = false;
  private connectionAttempts = 0;
  private maxRetries = 5;
  private retryDelay = 5000; // 5 seconds

  private constructor() {}

  public static getInstance(): DatabaseConnection {
    if (!DatabaseConnection.instance) {
      DatabaseConnection.instance = new DatabaseConnection();
    }
    return DatabaseConnection.instance;
  }

  public async connect(): Promise<void> {
    if (this.isConnected) {
      logger.debug('Database already connected');
      return;
    }

    while (this.connectionAttempts < this.maxRetries) {
      try {
        this.connectionAttempts++;
        logger.info('Attempting database connection', { 
          attempt: this.connectionAttempts, 
          maxRetries: this.maxRetries 
        });

        const options = {
          autoIndex: environment.NODE_ENV !== 'production',
          maxPoolSize: 10,
          serverSelectionTimeoutMS: 5000,
          socketTimeoutMS: 45000,
          family: 4, // Use IPv4, skip trying IPv6
        };

        await mongoose.connect(environment.MONGODB_URI, options);
        
        this.isConnected = true;
        this.connectionAttempts = 0; // Reset on successful connection
        
        logger.info('Database connected successfully', {
          host: this.getMaskedUri(),
          environment: environment.NODE_ENV
        });

        this.setupEventHandlers();
        return;

      } catch (error) {
        logger.error('Database connection failed', {
          attempt: this.connectionAttempts,
          error: error instanceof Error ? error.message : 'Unknown error',
          willRetry: this.connectionAttempts < this.maxRetries
        });

        if (this.connectionAttempts >= this.maxRetries) {
          throw new DatabaseConnectionError(
            `Failed to connect to database after ${this.maxRetries} attempts`,
            error instanceof Error ? error : new Error('Unknown database error')
          );
        }

        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, this.retryDelay));
      }
    }
  }

  private setupEventHandlers(): void {
    mongoose.connection.on('error', (error) => {
      logger.error('Database connection error', { error: error.message });
      this.isConnected = false;
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('Database disconnected');
      this.isConnected = false;
    });

    mongoose.connection.on('reconnected', () => {
      logger.info('Database reconnected');
      this.isConnected = true;
    });

    process.on('SIGINT', async () => {
      await this.disconnect();
      process.exit(0);
    });
  }

  public async disconnect(): Promise<void> {
    if (!this.isConnected) {
      return;
    }

    try {
      await mongoose.connection.close();
      this.isConnected = false;
      logger.info('Database disconnected gracefully');
    } catch (error) {
      logger.error('Error during database disconnection', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  public isConnectedToDatabase(): boolean {
    return this.isConnected && mongoose.connection.readyState === 1;
  }

  private getMaskedUri(): string {
    try {
      const uri = new URL(environment.MONGODB_URI);
      return `${uri.protocol}//${uri.host}${uri.pathname}`;
    } catch {
      return 'mongodb://[masked]';
    }
  }
}