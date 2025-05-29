import { Application } from 'express';
import { ExpressAdapter } from './ExpressAdapter';
import { PassportAdapter } from './PassportAdapter';
import { DatabaseAdapter } from './DatabaseAdapter';
import { ConfigAdapter } from './ConfigAdapter';
import { AppRoutes } from '../../presentation/routes';
import { PassportConfig } from '../../infrastructure/auth/passport/PassportConfig';
import { DatabaseConnection } from '../../infrastructure/database/mongoose/connection';
import { logger } from '../../shared/utils/logger';

export class AdapterManager {
  private readonly logger = logger.setContext({ service: 'AdapterManager' });
  
  public readonly expressAdapter: ExpressAdapter;
  public readonly passportAdapter: PassportAdapter;
  public readonly databaseAdapter: DatabaseAdapter;
  public readonly configAdapter: ConfigAdapter;

  constructor(
    appRoutes: AppRoutes,
    passportConfig: PassportConfig,
    databaseConnection: DatabaseConnection
  ) {
    this.configAdapter = new ConfigAdapter();
    this.databaseAdapter = new DatabaseAdapter(databaseConnection);
    this.expressAdapter = new ExpressAdapter(appRoutes);
    this.passportAdapter = new PassportAdapter(
      this.expressAdapter.getApp(),
      passportConfig
    );
  }

  public async initializeAll(): Promise<void> {
    this.logger.info('Initializing all adapters');

    try {
      // Order matters: config first, then database, then Express setup
      await this.configAdapter.initialize();
      await this.databaseAdapter.initialize();
      
      // Initialize passport after Express app is ready
      this.passportAdapter.initialize();

      this.logger.info('All adapters initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize adapters', { error });
      throw error;
    }
  }

  public async startServer(): Promise<void> {
    try {
      this.logger.info('Starting server');
      await this.expressAdapter.start();
      this.logger.info('Server started successfully');
    } catch (error) {
      this.logger.error('Failed to start server', { error });
      throw error;
    }
  }

  public getExpressApp(): Application {
    return this.expressAdapter.getApp();
  }

  public async dispose(): Promise<void> {
    try {
      this.logger.info('Disposing all adapters');
      
      // Dispose in reverse order
      await this.databaseAdapter.disconnect();
      
      this.logger.info('All adapters disposed successfully');
    } catch (error) {
      this.logger.error('Failed to dispose adapters', { error });
      throw error;
    }
  }
}

export {
  ExpressAdapter,
  PassportAdapter,
  DatabaseAdapter,
  ConfigAdapter
};