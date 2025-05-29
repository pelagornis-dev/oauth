import { Container } from 'inversify';
import { AuthenticationMiddleware } from '../../presentation/middlewares/AuthenticationMiddleware';
import { AuthorizationMiddleware } from '../../presentation/middlewares/AuthorizationMiddleware';
import { ErrorHandlingMiddleware } from '../../presentation/middlewares/ErrorHandlingMiddleware';
import { ValidationMiddleware } from '../../presentation/middlewares/ValidationMiddleware';
import { LocalizationMiddleware } from '../../presentation/middlewares/LocalizationMiddleware';
import { RateLimitMiddleware } from '../../presentation/middlewares/RateLimitMiddleware';
import { TYPES } from '../di/types';
import { logger } from '../../shared/utils/logger';

export class MiddlewareFactory {
  private readonly logger = logger.setContext({ factory: 'MiddlewareFactory' });

  constructor(private container: Container) {}

  public initialize(): void {
    this.logger.info('Initializing middlewares');
    // Middlewares don't need async initialization
    this.logger.info('Middlewares initialized successfully');
  }

  public getAuthenticationMiddleware(): AuthenticationMiddleware {
    return this.container.get<AuthenticationMiddleware>(TYPES.AuthenticationMiddleware);
  }

  public getAuthorizationMiddleware(): AuthorizationMiddleware {
    return this.container.get<AuthorizationMiddleware>(TYPES.AuthorizationMiddleware);
  }

  public getErrorHandlingMiddleware(): ErrorHandlingMiddleware {
    return this.container.get<ErrorHandlingMiddleware>(TYPES.ErrorHandlingMiddleware);
  }

  public getValidationMiddleware(): ValidationMiddleware {
    return this.container.get<ValidationMiddleware>(TYPES.ValidationMiddleware);
  }

  public getLocalizationMiddleware(): LocalizationMiddleware {
    return this.container.get<LocalizationMiddleware>(TYPES.LocalizationMiddleware);
  }

  public getRateLimitMiddleware(): RateLimitMiddleware {
    return this.container.get<RateLimitMiddleware>(TYPES.RateLimitMiddleware);
  }
}