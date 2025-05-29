import { Container } from 'inversify';
import { AuthRoutes } from '../../presentation/routes/authRoutes';
import { UserRoutes } from '../../presentation/routes/userRoutes';
import { AppRoutes } from '../../presentation/routes';
import { TYPES } from '../di/types';
import { logger } from '../../shared/utils/logger';

export class RouteFactory {
  private readonly logger = logger.setContext({ factory: 'RouteFactory' });

  constructor(private container: Container) {}

  public initialize(): void {
    this.logger.info('Initializing routes');
    // Routes don't need async initialization
    this.logger.info('Routes initialized successfully');
  }

  public getAuthRoutes(): AuthRoutes {
    return this.container.get<AuthRoutes>(TYPES.AuthRoutes);
  }

  public getUserRoutes(): UserRoutes {
    return this.container.get<UserRoutes>(TYPES.UserRoutes);
  }

  public getAppRoutes(): AppRoutes {
    return this.container.get<AppRoutes>(TYPES.AppRoutes);
  }
}