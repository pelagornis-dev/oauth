import { Container } from 'inversify';
import { RepositoryFactory } from './RepositoryFactory';
import { ServiceFactory } from './ServiceFactory';
import { UseCaseFactory } from './UseCaseFactory';
import { ControllerFactory } from './ControllerFactory';
import { MiddlewareFactory } from './MiddlewareFactory';
import { RouteFactory } from './RouteFactory';
import { logger } from '../../shared/utils/logger';

export class FactoryManager {
  private readonly logger = logger.setContext({ service: 'FactoryManager' });
  
  public readonly repositoryFactory: RepositoryFactory;
  public readonly serviceFactory: ServiceFactory;
  public readonly useCaseFactory: UseCaseFactory;
  public readonly controllerFactory: ControllerFactory;
  public readonly middlewareFactory: MiddlewareFactory;
  public readonly routeFactory: RouteFactory;

  constructor(container: Container) {
    this.repositoryFactory = new RepositoryFactory(container);
    this.serviceFactory = new ServiceFactory(container);
    this.useCaseFactory = new UseCaseFactory(container);
    this.controllerFactory = new ControllerFactory(container);
    this.middlewareFactory = new MiddlewareFactory(container);
    this.routeFactory = new RouteFactory(container);
  }

  public async initializeAll(): Promise<void> {
    this.logger.info('Initializing all factories');

    try {
      // Order matters: repositories first, then services, then other layers
      await this.repositoryFactory.initialize();
      await this.serviceFactory.initialize();
      
      // These are synchronous initializations
      this.useCaseFactory.initialize();
      this.controllerFactory.initialize();
      this.middlewareFactory.initialize();
      this.routeFactory.initialize();

      this.logger.info('All factories initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize factories', { error });
      throw error;
    }
  }

  public async dispose(): Promise<void> {
    try {
      this.logger.info('Disposing all factories');
      
      // Dispose in reverse order
      await this.repositoryFactory.dispose();
      
      this.logger.info('All factories disposed successfully');
    } catch (error) {
      this.logger.error('Failed to dispose factories', { error });
      throw error;
    }
  }
}

export {
  RepositoryFactory,
  ServiceFactory,
  UseCaseFactory,
  ControllerFactory,
  MiddlewareFactory,
  RouteFactory
};