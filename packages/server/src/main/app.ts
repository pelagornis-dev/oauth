import 'reflect-metadata';
import { DIContainer } from './di/container';
import { FactoryManager } from './factories';
import { AdapterManager } from './adapters';
import { AppRoutes } from '../presentation/routes';
import { PassportConfig } from '../infrastructure/auth/passport/PassportConfig';
import { DatabaseConnection } from '../infrastructure/database/mongoose/connection';
import { TYPES } from './di/types';
import { logger } from '../shared/utils/logger';
import { environment } from '../infrastructure/config/environment';

export class Application {
  private diContainer: DIContainer;
  private factoryManager: FactoryManager;
  private adapterManager: AdapterManager;
  private readonly logger = logger.setContext({ service: 'Application' });

  constructor() {
    this.logger.info('Creating application instance');
  }

  public async initialize(): Promise<void> {
    try {
      this.logger.info('Initializing application');

      // Step 1: Initialize DI Container
      await this.initializeDIContainer();

      // Step 2: Initialize Factories
      await this.initializeFactories();

      // Step 3: Initialize Adapters
      await this.initializeAdapters();

      this.logger.info('Application initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize application', { error });
      throw error;
    }
  }

  private async initializeDIContainer(): Promise<void> {
    this.logger.info('Initializing DI container');
    
    this.diContainer = new DIContainer();
    
    this.logger.info('DI container initialized');
  }

  private async initializeFactories(): Promise<void> {
    this.logger.info('Initializing factories');
    
    this.factoryManager = new FactoryManager(this.diContainer.getContainer());
    await this.factoryManager.initializeAll();
    
    this.logger.info('Factories initialized');
  }

  private async initializeAdapters(): Promise<void> {
    this.logger.info('Initializing adapters');
    
    // Get required dependencies for adapters
    const appRoutes = this.diContainer.get<AppRoutes>(TYPES.AppRoutes);
    const passportConfig = this.diContainer.get<PassportConfig>(TYPES.PassportConfig);
    const databaseConnection = this.diContainer.get<DatabaseConnection>(TYPES.DatabaseConnection);

    this.adapterManager = new AdapterManager(
      appRoutes,
      passportConfig,
      databaseConnection
    );

    await this.adapterManager.initializeAll();
    
    this.logger.info('Adapters initialized');
  }

  public async start(): Promise<void> {
    try {
      this.logger.info('Starting application server');
      
      await this.adapterManager.startServer();
      
      this.logger.info('Application server started successfully');
    } catch (error) {
      this.logger.error('Failed to start application server', { error });
      throw error;
    }
  }

  public async dispose(): Promise<void> {
    try {
      this.logger.info('Disposing application');
      
      // Dispose in reverse order of initialization
      if (this.adapterManager) {
        await this.adapterManager.dispose();
      }
      
      if (this.factoryManager) {
        await this.factoryManager.dispose();
      }
      
      if (this.diContainer) {
        await this.diContainer.dispose();
      }
      
      this.logger.info('Application disposed successfully');
    } catch (error) {
      this.logger.error('Failed to dispose application', { error });
      throw error;
    }
  }

  // Utility methods for testing or debugging
  public getDIContainer(): DIContainer {
    return this.diContainer;
  }

  public getFactoryManager(): FactoryManager {
    return this.factoryManager;
  }

  public getAdapterManager(): AdapterManager {
    return this.adapterManager;
  }

  // Health check method
  public async healthCheck(): Promise<{
    status: 'healthy' | 'unhealthy';
    timestamp: string;
    version: string;
    environment: string;
    uptime: number;
    dependencies: {
      database: boolean;
      email: boolean;
      localization: boolean;
    };
  }> {
    try {
      const databaseConnection = this.diContainer.get<DatabaseConnection>(TYPES.DatabaseConnection);
      const emailService = this.factoryManager.serviceFactory.getEmailService();
      const localizationService = this.factoryManager.serviceFactory.getLocalizationService();

      const emailHealth = await emailService.healthCheck();
      const localizationHealth = localizationService.healthCheck();

      const dependencies = {
        database: databaseConnection.isConnectedToDatabase(),
        email: emailHealth.healthy,
        localization: localizationHealth.healthy
      };

      const allHealthy = Object.values(dependencies).every(Boolean);

      return {
        status: allHealthy ? 'healthy' : 'unhealthy',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        environment: environment.NODE_ENV,
        uptime: Math.floor(process.uptime()),
        dependencies
      };
    } catch (error) {
      this.logger.error('Health check failed', { error });
      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        environment: environment.NODE_ENV,
        uptime: Math.floor(process.uptime()),
        dependencies: {
          database: false,
          email: false,
          localization: false
        }
      };
    }
  }
}