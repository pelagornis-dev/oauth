import { Strategy as PassportJwtStrategy, ExtractJwt, StrategyOptions } from 'passport-jwt';
import { IUserRepository } from '../../../../app/interfaces/repositories/IUserRepository';
import { ITokenService, TokenPayload } from '../../../../app/interfaces/services/ITokenService';
import { authConfig } from '../../../config/auth';
import { UserStatus } from '../../../../domain/enums/UserStatus';
import { logger } from '../../../../shared/utils/logger';

export class JwtStrategy extends PassportJwtStrategy {
  private readonly logger = logger.setContext({ strategy: 'JwtStrategy' });

  constructor(
    private userRepository: IUserRepository,
    private tokenService: ITokenService
  ) {
    const options: StrategyOptions = {
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: authConfig.jwt.secret,
      issuer: authConfig.jwt.issuer,
      audience: authConfig.jwt.audience,
      algorithms: [authConfig.jwt.algorithm]
    };

    super(options, async (payload: TokenPayload, done) => {
      try {
        await this.authenticate(payload, done);
      } catch (error) {
        done(error);
      }
    });
  }

  private async authenticate(
    payload: TokenPayload,
    done: (error: any, user?: any, info?: any) => void
  ): Promise<void> {
    try {
      this.logger.debug('Attempting JWT authentication', { 
        userId: payload.sub,
        tokenType: payload.type 
      });

      // Validate token type
      if (payload.type !== 'access') {
        this.logger.warn('Invalid token type for authentication', { 
          type: payload.type,
          userId: payload.sub 
        });
        return done(null, false, { message: 'Invalid token type' });
      }

      // Find user by ID
      const user = await this.userRepository.findById(payload.sub);
      if (!user) {
        this.logger.warn('User not found for JWT payload', { userId: payload.sub });
        return done(null, false, { message: 'User not found' });
      }

      // Check if user account is active
      if (user.getStatus() === UserStatus.SUSPENDED) {
        this.logger.warn('Suspended user attempted access', { userId: user.getId() });
        return done(null, false, { message: 'Account has been suspended' });
      }

      this.logger.debug('JWT authentication successful', { userId: user.getId() });

      // Return user data for request
      const userData = {
        id: user.getId(),
        email: user.getEmail().getValue(),
        firstName: user.getFirstName(),
        lastName: user.getLastName(),
        provider: user.getProvider(),
        emailVerified: user.isEmailVerified()
      };

      return done(null, userData);
    } catch (error) {
      this.logger.error('JWT authentication error', { 
        userId: payload?.sub,
        error 
      });
      return done(error);
    }
  }
}