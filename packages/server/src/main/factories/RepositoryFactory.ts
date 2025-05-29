import { Container } from 'inversify';
import { IUserRepository } from '../../app/interfaces/repositories/IUserRepository';
import { ITokenRepository } from '../../app/interfaces/repositories/ITokenRepository';
import { IClientRepository } from '../../app/interfaces/repositories/IClientRepository';
import { IVerificationTokenRepository } from '../../app/interfaces/repositories/IVerificationTokenRepository';
import { DatabaseConnection } from '../../infrastructure/database/mongoose/connection';
import { TYPES } from '../di/types';
import { logger } from '../../shared/utils/logger';

export class RepositoryFactory {
  private readonly logger = logger.setContext({ factory: 'RepositoryFactory' });

  constructor(private container: Container) {}

  public async initialize(): Promise<void> {
    this.logger.info('Initializing repositories');

    try {
      // Initialize database connection first
      const dbConnection = this.container.get<DatabaseConnection>(TYPES.DatabaseConnection);
      await dbConnection.connect();

      this.logger.info('Repositories initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize repositories', { error });
      throw error;
    }
  }

  public getUserRepository(): IUserRepository {
    return this.container.get<IUserRepository>(TYPES.IUserRepository);
  }

  public getTokenRepository(): ITokenRepository {
    return this.container.get<ITokenRepository>(TYPES.ITokenRepository);
  }

  public getClientRepository(): IClientRepository {
    return this.container.get<IClientRepository>(TYPES.IClientRepository);
  }

  public getVerificationTokenRepository(): IVerificationTokenRepository {
    return this.container.get<IVerificationTokenRepository>(TYPES.IVerificationTokenRepository);
  }

  public getDatabaseConnection(): DatabaseConnection {
    return this.container.get<DatabaseConnection>(TYPES.DatabaseConnection);
  }

  public async dispose(): Promise<void> {
    try {
      this.logger.info('Disposing repositories');
      
      const dbConnection = this.container.get<DatabaseConnection>(TYPES.DatabaseConnection);
      await dbConnection.disconnect();
      
      this.logger.info('Repositories disposed successfully');
    } catch (error) {
      this.logger.error('Failed to dispose repositories', { error });
      throw error;
    }
  }
}