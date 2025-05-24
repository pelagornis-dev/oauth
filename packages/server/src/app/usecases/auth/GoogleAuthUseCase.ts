import { BaseUseCase } from '../common/BaseUseCase';
import { GoogleAuthResponseDto } from '../../dto/auth/GoogleAuthResponseDto';
import { IUserRepository } from '../../interfaces/repositories/IUserRepository';
import { ITokenService } from '../../interfaces/services/ITokenService';
import { User } from '../../../domain/entities/User';
import { Email } from '../../../domain/value-objects/Email';
import { AuthProvider } from '../../../domain/enums/AuthProvider';
import { ValidationUtils } from '../../../shared/utils/validation';
import { CryptoUtils } from '../../../shared/utils/crypto';

export interface GoogleAuthRequest {
  googleId: string;
  email: string;
  firstName: string;
  lastName: string;
  clientId?: string;
  redirectUri?: string;
}

export class GoogleAuthUseCase extends BaseUseCase<GoogleAuthRequest, GoogleAuthResponseDto> {
  constructor(
    private userRepository: IUserRepository,
    private tokenService: ITokenService
  ) {
    super();
  }

  async execute(request: GoogleAuthRequest): Promise<GoogleAuthResponseDto> {
    this.logExecutionStart(request);

    try {
      // Validate input
      this.validateRequest(request);

      const email = new Email(request.email);
      
      // Find existing user by Google ID or email
      let user = await this.userRepository.findByProviderInfo(AuthProvider.GOOGLE, request.googleId);
      
      if (!user) {
        user = await this.userRepository.findByEmail(email);
      }

      if (!user) {
        // Create new user
        user = new User(
          CryptoUtils.generateUUID(),
          email,
          ValidationUtils.sanitizeString(request.firstName),
          ValidationUtils.sanitizeString(request.lastName),
          AuthProvider.GOOGLE,
          undefined,
          request.googleId
        );
        user.verifyEmail(); // Google users are auto-verified
        user = await this.userRepository.save(user);

        this.logger.info('New Google user created', { 
          userId: user.getId(),
          googleId: request.googleId
        });
      } else if (user.getProvider() === AuthProvider.LOCAL) {
        // Link existing local account with Google
        this.logger.warn('Account linking attempted but not implemented', {
          userId: user.getId(),
          googleId: request.googleId
        });
        throw new Error('Account linking not implemented');
      }

      // Update last login
      user.updateLastLogin();
      await this.userRepository.update(user);

      // Generate tokens
      const tokenPayload = {
        sub: user.getId(),
        email: user.getEmail().getValue(),
        type: 'access'
      };

      const accessToken = await this.tokenService.generateAccessToken(tokenPayload);
      const refreshToken = await this.tokenService.generateRefreshToken({
        ...tokenPayload,
        type: 'refresh'
      });

      const response: GoogleAuthResponseDto = {
        accessToken,
        refreshToken,
        user: {
          id: user.getId(),
          email: user.getEmail().getValue(),
          firstName: user.getFirstName(),
          lastName: user.getLastName(),
          emailVerified: user.isEmailVerified(),
          provider: user.getProvider()
        },
        expiresIn: 3600,
        tokenType: 'Bearer',
        redirectUrl: request.redirectUri || '/'
      };

      this.logger.info('Google authentication successful', { 
        userId: user.getId(),
        googleId: request.googleId
      });

      this.logExecutionEnd(response);
      return response;

    } catch (error) {
      this.logExecutionError(error as Error, request);
      throw error;
    }
  }

  private validateRequest(request: GoogleAuthRequest): void {
    if (!request.googleId?.trim()) {
      throw new Error('Google ID is required');
    }

    if (!ValidationUtils.isValidEmail(request.email)) {
      throw new Error('Invalid email format');
    }

    if (!request.firstName?.trim()) {
      throw new Error('First name is required');
    }

    if (!request.lastName?.trim()) {
      throw new Error('Last name is required');
    }

    if (request.redirectUri && !ValidationUtils.isValidUrl(request.redirectUri)) {
      throw new Error('Invalid redirect URI format');
    }
  }
}