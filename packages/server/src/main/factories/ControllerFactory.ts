import { Container } from 'inversify';
import { AuthController } from '../../presentation/controllers/AuthController';
import { UserController } from '../../presentation/controllers/UserController';
import { HealthController } from '../../presentation/controllers/HealthController';
import { TYPES } from '../di/types';
import { logger } from '../../shared/utils/logger';

export class ControllerFactory {
  private readonly logger = logger.setContext({ factory: 'ControllerFactory' });

  constructor(private container: Container) {}

  public initialize(): void {
    this.logger.info('Initializing controllers');
    // Controllers don't need async initialization
    this.logger.info('Controllers initialized successfully');
  }

  public getAuthController(): AuthController {
    return this.container.get<AuthController>(TYPES.AuthController);
  }

  public getUserController(): UserController {
    return this.container.get<UserController>(TYPES.UserController);
  }

  public getHealthController(): HealthController {
    return this.container.get<HealthController>(TYPES.HealthController);
  }
}