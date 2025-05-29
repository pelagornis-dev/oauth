import passport from 'passport';
import { LocalStrategy } from './strategies/LocalStrategy';
import { JwtStrategy } from './strategies/JwtStrategy';
import { GoogleStrategy } from './strategies/GoogleStrategy';
import { IUserRepository } from '../../../app/interfaces/repositories/IUserRepository';
import { IPasswordService } from '../../../app/interfaces/services/IPasswordService';
import { ITokenService } from '../../../app/interfaces/services/ITokenService';
import { logger } from '../../../shared/utils/logger';

export class PassportConfig {
  private readonly logger = logger.setContext({ service: 'PassportConfig' });

  constructor(
    private userRepository: IUserRepository,
    private passwordService: IPasswordService,
    private tokenService: ITokenService
  ) {}

  public initialize(): void {
    this.logger.info('Initializing Passport configuration');

    // Initialize strategies
    this.initializeLocalStrategy();
    this.initializeJwtStrategy();
    this.initializeGoogleStrategy();

    // Configure session serialization
    this.configureSession();

    this.logger.info('Passport configuration completed');
  }

  private initializeLocalStrategy(): void {
    const localStrategy = new LocalStrategy(
      this.userRepository,
      this.passwordService
    );

    passport.use('local', localStrategy);
    this.logger.debug('Local strategy configured');
  }

  private initializeJwtStrategy(): void {
    const jwtStrategy = new JwtStrategy(
      this.userRepository,
      this.tokenService
    );

    passport.use('jwt', jwtStrategy);
    this.logger.debug('JWT strategy configured');
  }

  private initializeGoogleStrategy(): void {
    const googleStrategy = new GoogleStrategy(this.userRepository);

    passport.use('google', googleStrategy);
    this.logger.debug('Google OAuth strategy configured');
  }

  private configureSession(): void {
    // Serialize user for session
    passport.serializeUser((user: any, done) => {
      this.logger.debug('Serializing user for session', { userId: user.id });
      done(null, user.id);
    });

    // Deserialize user from session
    passport.deserializeUser(async (id: string, done) => {
      try {
        this.logger.debug('Deserializing user from session', { userId: id });
        
        const user = await this.userRepository.findById(id);
        if (!user) {
          this.logger.warn('User not found during deserialization', { userId: id });
          return done(null, false);
        }

        const userData = {
          id: user.getId(),
          email: user.getEmail().getValue(),
          firstName: user.getFirstName(),
          lastName: user.getLastName(),
          provider: user.getProvider(),
          emailVerified: user.isEmailVerified()
        };

        done(null, userData);
      } catch (error) {
        this.logger.error('Error deserializing user', { userId: id, error });
        done(error);
      }
    });
  }

  public getPassportInstance(): typeof passport {
    return passport;
  }
}