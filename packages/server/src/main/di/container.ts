import { Container } from 'inversify';
import 'reflect-metadata';

// Infrastructure imports
import { BcryptPasswordService } from '../../infrastructure/services/BcryptPasswordService';
import { JwtTokenService } from '../../infrastructure/auth/jwt/JwtTokenService';
import { NodemailerEmailService } from '../../infrastructure/email/nodemailer/NodemailerEmailService';
import { SESEmailService } from '../../infrastructure/email/ses/SESEmailService';
import { LocalizationService } from '../../infrastructure/localization/LocalizationService';
import { DatabaseConnection } from '../../infrastructure/database/mongoose/connection';
import { MongoUserRepository } from '../../infrastructure/database/mongoose/repositories/MongoUserRepository';
import { MongoTokenRepository } from '../../infrastructure/database/mongoose/repositories/MongoTokenRepository';
import { MongoClientRepository } from '../../infrastructure/database/mongoose/repositories/MongoClientRepository';
import { MongoVerificationTokenRepository } from '../../infrastructure/database/mongoose/repositories/MongoVerificationTokenRepository';
import { PassportConfig } from '../../infrastructure/auth/passport/PassportConfig';

// Application imports
import { LoginUseCase } from '../../app/usecases/auth/LoginUseCase';
import { RegisterUseCase } from '../../app/usecases/auth/RegisterUseCase';
import { GoogleAuthUseCase } from '../../app/usecases/auth/GoogleAuthUseCase';
import { LogoutUseCase } from '../../app/usecases/auth/LogoutUseCase';
import { RefreshTokenUseCase } from '../../app/usecases/auth/RefreshTokenUseCase';
import { GetUserUseCase } from '../../app/usecases/user/GetUserUseCase';
import { UpdateUserUseCase } from '../../app/usecases/user/UpdateUserUseCase';
import { VerifyEmailUseCase } from '../../app/usecases/user/VerifyEmailUseCase';
import { ResetPasswordUseCase } from '../../app/usecases/user/ResetPasswordUseCase';

// Presentation imports
import { AuthController } from '../../presentation/controllers/AuthController';
import { UserController } from '../../presentation/controllers/UserController';
import { HealthController } from '../../presentation/controllers/HealthController';
import { AuthenticationMiddleware } from '../../presentation/middlewares/AuthenticationMiddleware';
import { AuthorizationMiddleware } from '../../presentation/middlewares/AuthorizationMiddleware';
import { ErrorHandlingMiddleware } from '../../presentation/middlewares/ErrorHandlingMiddleware';
import { ValidationMiddleware } from '../../presentation/middlewares/ValidationMiddleware';
import { LocalizationMiddleware } from '../../presentation/middlewares/LocalizationMiddleware';
import { RateLimitMiddleware } from '../../presentation/middlewares/RateLimitMiddleware';
import { UserSerializer } from '../../presentation/serializers/UserSerializer';
import { TokenSerializer } from '../../presentation/serializers/TokenSerializer';
import { ErrorSerializer } from '../../presentation/serializers/ErrorSerializer';
import { AuthValidator } from '../../presentation/validators/AuthValidator';
import { UserValidator } from '../../presentation/validators/UserValidator';
import { CommonValidator } from '../../presentation/validators/CommonValidator';
import { AuthRoutes } from '../../presentation/routes/authRoutes';
import { UserRoutes } from '../../presentation/routes/userRoutes';
import { AppRoutes } from '../../presentation/routes';

// Interface imports
import { IPasswordService } from '../../app/interfaces/services/IPasswordService';
import { ITokenService } from '../../app/interfaces/services/ITokenService';
import { IEmailService } from '../../app/interfaces/services/IEmailService';
import { ILocalizationService } from '../../app/interfaces/services/ILocalizationService';
import { IUserRepository } from '../../app/interfaces/repositories/IUserRepository';
import { ITokenRepository } from '../../app/interfaces/repositories/ITokenRepository';
import { IClientRepository } from '../../app/interfaces/repositories/IClientRepository';
import { IVerificationTokenRepository } from '../../app/interfaces/repositories/IVerificationTokenRepository';

import { environment } from '../../infrastructure/config/environment';
import { logger } from '../../shared/utils/logger';
import { TYPES } from './types';

export class DIContainer {
  private container: Container;
  private readonly logger = logger.setContext({ service: 'DIContainer' });

  constructor() {
    this.container = new Container({
      defaultScope: 'Singleton',
      autoBindInjectable: true,
      skipBaseClassChecks: true
    });
    
    this.registerDependencies();
  }

  private registerDependencies(): void {
    this.logger.info('Registering dependencies in DI container');

    try {
      // Infrastructure Services
      this.registerInfrastructureServices();
      
      // Infrastructure Repositories
      this.registerInfrastructureRepositories();
      
      // Database
      this.registerDatabase();
      
      // Application Use Cases
      this.registerUseCases();
      
      // Presentation Controllers
      this.registerControllers();
      
      // Presentation Middlewares
      this.registerMiddlewares();
      
      // Presentation Serializers & Validators
      this.registerSerializersAndValidators();
      
      // Presentation Routes
      this.registerRoutes();
      
      // Infrastructure Auth
      this.registerAuth();

      this.logger.info('All dependencies registered successfully');
    } catch (error) {
      this.logger.error('Failed to register dependencies', { error });
      throw error;
    }
  }

  private registerInfrastructureServices(): void {
    // Password Service
    this.container.bind<IPasswordService>(TYPES.IPasswordService)
      .to(BcryptPasswordService)
      .inSingletonScope();

    // Token Service
    this.container.bind<ITokenService>(TYPES.ITokenService)
      .to(JwtTokenService)
      .inSingletonScope();

    // Email Service (choose based on environment)
    if (environment.EMAIL_PROVIDER === 'ses') {
      this.container.bind<IEmailService>(TYPES.IEmailService)
        .to(SESEmailService)
        .inSingletonScope();
    } else {
      this.container.bind<IEmailService>(TYPES.IEmailService)
        .to(NodemailerEmailService)
        .inSingletonScope();
    }

    // Localization Service
    this.container.bind<ILocalizationService>(TYPES.ILocalizationService)
      .to(LocalizationService)
      .inSingletonScope();

    this.logger.debug('Infrastructure services registered');
  }

  private registerInfrastructureRepositories(): void {
    // User Repository
    this.container.bind<IUserRepository>(TYPES.IUserRepository)
      .to(MongoUserRepository)
      .inSingletonScope();

    // Token Repository
    this.container.bind<ITokenRepository>(TYPES.ITokenRepository)
      .to(MongoTokenRepository)
      .inSingletonScope();

    // Client Repository
    this.container.bind<IClientRepository>(TYPES.IClientRepository)
      .to(MongoClientRepository)
      .inSingletonScope();

    // Verification Token Repository
    this.container.bind<IVerificationTokenRepository>(TYPES.IVerificationTokenRepository)
      .to(MongoVerificationTokenRepository)
      .inSingletonScope();

    this.logger.debug('Infrastructure repositories registered');
  }

  private registerDatabase(): void {
    this.container.bind<DatabaseConnection>(TYPES.DatabaseConnection)
      .to(DatabaseConnection)
      .inSingletonScope();

    this.logger.debug('Database connection registered');
  }

  private registerUseCases(): void {
    // Auth Use Cases
    this.container.bind<LoginUseCase>(TYPES.LoginUseCase).to(LoginUseCase);
    this.container.bind<RegisterUseCase>(TYPES.RegisterUseCase).to(RegisterUseCase);
    this.container.bind<GoogleAuthUseCase>(TYPES.GoogleAuthUseCase).to(GoogleAuthUseCase);
    this.container.bind<LogoutUseCase>(TYPES.LogoutUseCase).to(LogoutUseCase);
    this.container.bind<RefreshTokenUseCase>(TYPES.RefreshTokenUseCase).to(RefreshTokenUseCase);

    // User Use Cases
    this.container.bind<GetUserUseCase>(TYPES.GetUserUseCase).to(GetUserUseCase);
    this.container.bind<UpdateUserUseCase>(TYPES.UpdateUserUseCase).to(UpdateUserUseCase);
    this.container.bind<VerifyEmailUseCase>(TYPES.VerifyEmailUseCase).to(VerifyEmailUseCase);
    this.container.bind<ResetPasswordUseCase>(TYPES.ResetPasswordUseCase).to(ResetPasswordUseCase);

    this.logger.debug('Use cases registered');
  }

  private registerControllers(): void {
    this.container.bind<AuthController>(TYPES.AuthController).to(AuthController);
    this.container.bind<UserController>(TYPES.UserController).to(UserController);
    this.container.bind<HealthController>(TYPES.HealthController).to(HealthController);

    this.logger.debug('Controllers registered');
  }

  private registerMiddlewares(): void {
    this.container.bind<AuthenticationMiddleware>(TYPES.AuthenticationMiddleware)
      .to(AuthenticationMiddleware)
      .inSingletonScope();

    this.container.bind<AuthorizationMiddleware>(TYPES.AuthorizationMiddleware)
      .to(AuthorizationMiddleware)
      .inSingletonScope();

    this.container.bind<ErrorHandlingMiddleware>(TYPES.ErrorHandlingMiddleware)
      .to(ErrorHandlingMiddleware)
      .inSingletonScope();

    this.container.bind<ValidationMiddleware>(TYPES.ValidationMiddleware)
      .to(ValidationMiddleware)
      .inSingletonScope();

    this.container.bind<LocalizationMiddleware>(TYPES.LocalizationMiddleware)
      .to(LocalizationMiddleware)
      .inSingletonScope();

    this.container.bind<RateLimitMiddleware>(TYPES.RateLimitMiddleware)
      .to(RateLimitMiddleware)
      .inSingletonScope();

    this.logger.debug('Middlewares registered');
  }

  private registerSerializersAndValidators(): void {
    // Serializers
    this.container.bind<UserSerializer>(TYPES.UserSerializer)
      .to(UserSerializer)
      .inSingletonScope();

    this.container.bind<TokenSerializer>(TYPES.TokenSerializer)
      .to(TokenSerializer)
      .inSingletonScope();

    this.container.bind<ErrorSerializer>(TYPES.ErrorSerializer)
      .to(ErrorSerializer)
      .inSingletonScope();

    // Validators
    this.container.bind<AuthValidator>(TYPES.AuthValidator)
      .to(AuthValidator)
      .inSingletonScope();

    this.container.bind<UserValidator>(TYPES.UserValidator)
      .to(UserValidator)
      .inSingletonScope();

    this.container.bind<CommonValidator>(TYPES.CommonValidator)
      .to(CommonValidator)
      .inSingletonScope();

    this.logger.debug('Serializers and validators registered');
  }

  private registerRoutes(): void {
    this.container.bind<AuthRoutes>(TYPES.AuthRoutes).to(AuthRoutes);
    this.container.bind<UserRoutes>(TYPES.UserRoutes).to(UserRoutes);
    this.container.bind<AppRoutes>(TYPES.AppRoutes).to(AppRoutes);

    this.logger.debug('Routes registered');
  }

  private registerAuth(): void {
    this.container.bind<PassportConfig>(TYPES.PassportConfig)
      .to(PassportConfig)
      .inSingletonScope();

    this.logger.debug('Auth services registered');
  }

  public getContainer(): Container {
    return this.container;
  }

  public get<T>(serviceIdentifier: symbol): T {
    try {
      return this.container.get<T>(serviceIdentifier);
    } catch (error) {
      this.logger.error('Failed to resolve dependency', { 
        serviceIdentifier: serviceIdentifier.toString(),
        error 
      });
      throw error;
    }
  }

  public async dispose(): Promise<void> {
    try {
      this.logger.info('Disposing DI container');
      // Perform any cleanup if needed
      this.logger.info('DI container disposed successfully');
    } catch (error) {
      this.logger.error('Failed to dispose DI container', { error });
      throw error;
    }
  }
}