import { Container } from 'inversify';
import { LoginUseCase } from '../../app/usecases/auth/LoginUseCase';
import { RegisterUseCase } from '../../app/usecases/auth/RegisterUseCase';
import { GoogleAuthUseCase } from '../../app/usecases/auth/GoogleAuthUseCase';
import { LogoutUseCase } from '../../app/usecases/auth/LogoutUseCase';
import { RefreshTokenUseCase } from '../../app/usecases/auth/RefreshTokenUseCase';
import { GetUserUseCase } from '../../app/usecases/user/GetUserUseCase';
import { UpdateUserUseCase } from '../../app/usecases/user/UpdateUserUseCase';
import { VerifyEmailUseCase } from '../../app/usecases/user/VerifyEmailUseCase';
import { ResetPasswordUseCase } from '../../app/usecases/user/ResetPasswordUseCase';
import { TYPES } from '../di/types';
import { logger } from '../../shared/utils/logger';

export class UseCaseFactory {
  private readonly logger = logger.setContext({ factory: 'UseCaseFactory' });

  constructor(private container: Container) {}

  public initialize(): void {
    this.logger.info('Initializing use cases');
    // Use cases don't need async initialization
    this.logger.info('Use cases initialized successfully');
  }

  // Auth Use Cases
  public getLoginUseCase(): LoginUseCase {
    return this.container.get<LoginUseCase>(TYPES.LoginUseCase);
  }

  public getRegisterUseCase(): RegisterUseCase {
    return this.container.get<RegisterUseCase>(TYPES.RegisterUseCase);
  }

  public getGoogleAuthUseCase(): GoogleAuthUseCase {
    return this.container.get<GoogleAuthUseCase>(TYPES.GoogleAuthUseCase);
  }

  public getLogoutUseCase(): LogoutUseCase {
    return this.container.get<LogoutUseCase>(TYPES.LogoutUseCase);
  }

  public getRefreshTokenUseCase(): RefreshTokenUseCase {
    return this.container.get<RefreshTokenUseCase>(TYPES.RefreshTokenUseCase);
  }

  // User Use Cases
  public getGetUserUseCase(): GetUserUseCase {
    return this.container.get<GetUserUseCase>(TYPES.GetUserUseCase);
  }

  public getUpdateUserUseCase(): UpdateUserUseCase {
    return this.container.get<UpdateUserUseCase>(TYPES.UpdateUserUseCase);
  }

  public getVerifyEmailUseCase(): VerifyEmailUseCase {
    return this.container.get<VerifyEmailUseCase>(TYPES.VerifyEmailUseCase);
  }

  public getResetPasswordUseCase(): ResetPasswordUseCase {
    return this.container.get<ResetPasswordUseCase>(TYPES.ResetPasswordUseCase);
  }
}