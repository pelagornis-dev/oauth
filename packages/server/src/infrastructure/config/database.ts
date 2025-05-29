import { environment } from './environment';
import { logger } from '../../shared/utils/logger';

export const databaseConfig = {
  mongodb: {
    uri: environment.MONGODB_URI,
    options: {
      autoIndex: environment.NODE_ENV !== 'production',
      maxPoolSize: environment.NODE_ENV === 'production' ? 100 : 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      family: 4,
      bufferCommands: false,
      bufferMaxEntries: 0,
      retryWrites: true,
      retryReads: true,
      w: 'majority',
      readPreference: 'primary'
    },
    connectionTimeoutMS: 30000,
    maxRetries: 5,
    retryDelayMS: 5000
  }
} as const;

export class DatabaseConfig {
  static validate(): void {
    if (!environment.MONGODB_URI) {
      throw new Error('MONGODB_URI is required');
    }

    if (!environment.MONGODB_URI.startsWith('mongodb')) {
      throw new Error('MONGODB_URI must be a valid MongoDB connection string');
    }

    logger.info('Database configuration validated', {
      environment: environment.NODE_ENV,
      poolSize: databaseConfig.mongodb.options.maxPoolSize
    });
  }
}
