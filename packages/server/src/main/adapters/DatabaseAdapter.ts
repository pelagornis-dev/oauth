import { DatabaseConnection } from '../../infrastructure/database/mongoose/connection';
import { logger } from '../../shared/utils/logger';

export class DatabaseAdapter {
  private readonly logger = logger.setContext({ adapter: 'DatabaseAdapter' });

  constructor(private databaseConnection: DatabaseConnection) {}

  public async initialize(): Promise<void> {
    this.logger.info('Initializing database adapter');

    try {
      await this.databaseConnection.connect();
      this.logger.info('Database adapter initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize database adapter', { error });
      throw error;
    }
  }

  public async disconnect(): Promise<void> {
    try {
      this.logger.info('Disconnecting database adapter');
      await this.databaseConnection.disconnect();
      this.logger.info('Database adapter disconnected successfully');
    } catch (error) {
      this.logger.error('Failed to disconnect database adapter', { error });
      throw error;
    }
  }

  public isConnected(): boolean {
    return this.databaseConnection.isConnectedToDatabase();
  }

  public getDatabaseConnection(): DatabaseConnection {
    return this.databaseConnection;
  }
}