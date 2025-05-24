import { BaseUseCase } from '../common/BaseUseCase';
import { LoginRequestDto } from '../../dto/auth/LoginRequestDto';
import { LoginResponseDto } from '../../dto/auth/LoginResponseDto';
import { IUserRepository } from '../../interfaces/repositories/IUserRepository';
import { IPasswordService } from '../../interfaces/services/IPasswordService';
import { ITokenService } from '../../interfaces/services/ITokenService';
import { Email } from '../../../domain/value-objects/Email';
import { Password } from '../../../domain/value-objects/Password';
import { UserNotFoundException } from '../../../domain/exceptions/UserNotFoundException';
import { InvalidCredentialsException } from '../../../domain/exceptions/InvalidCredentialsException';
import { EmailNotVerifiedException } from '../../../domain/exceptions/EmailNotVerifiedException';
import { ValidationUtils } from '../../../shared/utils/validation';
import { CONFIG } from '../../../shared/constants/config';

export class LoginUseCase extends BaseUseCase<LoginRequestDto, LoginResponseDto> {
  constructor(
    private userRepository: IUserRepository,
    private passwordService: IPasswordService,
    private tokenService: ITokenService
  ) {
    super();
  }

  async execute(request: LoginRequestDto): Promise<LoginResponseDto> {
    this.logExecutionStart(request);

    try {
      // Validate input
      this.validateRequest(request);

      const email = new Email(request.email);
      const user = await this.userRepository.findByEmail(email);

      if (!user) {
        this.logger.warn('Login attempt with non-existent email', { email: request.email });
        throw new UserNotFoundException(request.email);
      }

      if (!user.getPassword()) {
        this.logger.warn('Login attempt on OAuth user with password', { 
          userId: user.getId(), 
          provider: user.getProvider() 
        });
        throw new InvalidCredentialsException();
      }

      const password = new Password(request.password);
      const isValidPassword = await this.passwordService.compare(
        password,
        user.getPassword()!.getValue()
      );

      if (!isValidPassword) {
        this.logger.warn('Invalid password attempt', { userId: user.getId() });
        throw new InvalidCredentialsException();
      }

      if (!user.isEmailVerified()) {
        this.logger.warn('Login attempt with unverified email', { userId: user.getId() });
        throw new EmailNotVerifiedException();
      }

      if (!user.canLogin()) {
        this.logger.warn('Login attempt blocked - user cannot login', { 
          userId: user.getId(), 
          status: user.getStatus() 
        });
        throw new Error('User account is not active');
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

      const response: LoginResponseDto = {
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
        expiresIn: 3600, // 1 hour
        tokenType: 'Bearer',
        redirectUrl: request.redirectUri
      };

      this.logger.info('User login successful', { 
        userId: user.getId(),
        provider: user.getProvider(),
        hasRedirectUri: !!request.redirectUri
      });

      this.logExecutionEnd(response);
      return response;

    } catch (error) {
      this.logExecutionError(error as Error, request);
      throw error;
    }
  }

  private validateRequest(request: LoginRequestDto): void {
    if (!ValidationUtils.isValidEmail(request.email)) {
      throw new Error('Invalid email format');
    }

    if (!request.password || request.password.length === 0) {
      throw new Error('Password is required');
    }

    if (request.redirectUri && !ValidationUtils.isValidUrl(request.redirectUri)) {
      throw new Error('Invalid redirect URI format');
    }
  }
}