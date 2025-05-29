export const TYPES = {
    // Infrastructure Services
    IPasswordService: Symbol.for('IPasswordService'),
    ITokenService: Symbol.for('ITokenService'),
    IEmailService: Symbol.for('IEmailService'),
    ILocalizationService: Symbol.for('ILocalizationService'),
    
    // Infrastructure Repositories
    IUserRepository: Symbol.for('IUserRepository'),
    ITokenRepository: Symbol.for('ITokenRepository'),
    IClientRepository: Symbol.for('IClientRepository'),
    IVerificationTokenRepository: Symbol.for('IVerificationTokenRepository'),
    
    // Database
    DatabaseConnection: Symbol.for('DatabaseConnection'),
    
    // Use Cases
    LoginUseCase: Symbol.for('LoginUseCase'),
    RegisterUseCase: Symbol.for('RegisterUseCase'),
    GoogleAuthUseCase: Symbol.for('GoogleAuthUseCase'),
    LogoutUseCase: Symbol.for('LogoutUseCase'),
    RefreshTokenUseCase: Symbol.for('RefreshTokenUseCase'),
    GetUserUseCase: Symbol.for('GetUserUseCase'),
    UpdateUserUseCase: Symbol.for('UpdateUserUseCase'),
    VerifyEmailUseCase: Symbol.for('VerifyEmailUseCase'),
    ResetPasswordUseCase: Symbol.for('ResetPasswordUseCase'),
    
    // Presentation Controllers
    AuthController: Symbol.for('AuthController'),
    UserController: Symbol.for('UserController'),
    HealthController: Symbol.for('HealthController'),
    
    // Presentation Middlewares
    AuthenticationMiddleware: Symbol.for('AuthenticationMiddleware'),
    AuthorizationMiddleware: Symbol.for('AuthorizationMiddleware'),
    ErrorHandlingMiddleware: Symbol.for('ErrorHandlingMiddleware'),
    ValidationMiddleware: Symbol.for('ValidationMiddleware'),
    LocalizationMiddleware: Symbol.for('LocalizationMiddleware'),
    RateLimitMiddleware: Symbol.for('RateLimitMiddleware'),
    
    // Presentation Serializers
    UserSerializer: Symbol.for('UserSerializer'),
    TokenSerializer: Symbol.for('TokenSerializer'),
    ErrorSerializer: Symbol.for('ErrorSerializer'),
    
    // Presentation Validators
    AuthValidator: Symbol.for('AuthValidator'),
    UserValidator: Symbol.for('UserValidator'),
    CommonValidator: Symbol.for('CommonValidator'),
    
    // Presentation Routes
    AuthRoutes: Symbol.for('AuthRoutes'),
    UserRoutes: Symbol.for('UserRoutes'),
    AppRoutes: Symbol.for('AppRoutes'),
    
    // Infrastructure Auth
    PassportConfig: Symbol.for('PassportConfig'),
    
    // Express App
    ExpressApp: Symbol.for('ExpressApp')
  } as const;