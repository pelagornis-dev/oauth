import { BaseUseCase } from '../common/BaseUseCase';
import { IUserRepository } from '../../interfaces/repositories/IUserRepository';
import { ITokenRepository } from '../../interfaces/repositories/ITokenRepository';
import { IPasswordService } from '../../interfaces/services/IPasswordService';
import { ITokenService } from '../../interfaces/services/ITokenService';
import { IEmailService } from '../../interfaces/services/IEmailService';
import { Email } from '../../../domain/value-objects/Email';
import { Password } from '../../../domain/value-objects/Password';
import { Token } from '../../../domain/entities/Token';
import { TokenValue } from '../../../domain/value-objects/TokenValue';
import { TokenType } from '../../../domain/enums/TokenType';
import { UserNotFoundException } from '../../../domain/exceptions/UserNotFoundException';
import { InvalidTokenException } from '../../../domain/exceptions/InvalidTokenException';
import { ValidationUtils } from '../../../shared/utils/validation';
import { CryptoUtils } from '../../../shared/utils/crypto';
import { DateUtils } from '../../../shared/utils/date';
import { CONFIG } from '../../../shared/constants/config';

export interface ResetPasswordRequest {
  email: string;
}

export interface ResetPasswordResponse {
  message: string;
  emailSent: boolean;
}

export interface ConfirmResetPasswordRequest {
  token: string;
  newPassword: string;
}

export interface ConfirmResetPasswordResponse {
  message: string;
  success: boolean;
}

export class ResetPasswordUseCase extends BaseUseCase<ResetPasswordRequest, ResetPasswordResponse> {
  constructor(
    private userRepository: IUserRepository,
    private tokenRepository: ITokenRepository,
    private tokenService: ITokenService,
    private emailService: IEmailService
  ) {
    super();
  }

  async execute(request: ResetPasswordRequest): Promise<ResetPasswordResponse> {
    this.logExecutionStart(request)     ;

    try {
      // Validate input
      if (!ValidationUtils.isValidEmail(request.email)) {
        throw new Error('Invalid email format');
      }

      const email = new Email(request.email);
      const user = await this.userRepository.findByEmail(email);

      if (!user) {
        this.logger.warn('Password reset requested for non-existent email', { 
          email: request.email 
        });
        
        // For security, don't reveal if email exists
        return {
          message: 'If an account with that email exists, a password reset link has been sent.',
          emailSent: false
        };
      }

      if (user.isOAuthUser()) {
        this.logger.warn('Password reset requested for OAuth user', { 
          userId: user.getId(),
          provider: user.getProvider()
        });
        
        return {
          message: 'Password reset is not available for OAuth accounts.',
          emailSent: false
        };
      }

      // Generate reset token
      const tokenString = await this.tokenService.generateVerificationToken();
      const expiresAt = DateUtils.addTime(new Date(), CONFIG.DEFAULT_RESET_TOKEN_EXPIRY, 'seconds');
      const tokenValue = new TokenValue(tokenString, expiresAt);
      
      const resetToken = new Token(
        CryptoUtils.generateUUID(),
        user.getId(),
        TokenType.RESET_PASSWORD,
        tokenValue
      );

      await this.tokenRepository.save(resetToken);

      // Send reset email
      try {
        await this.emailService.sendPasswordResetEmail(
          user.getEmail().getValue(),
          tokenString,
          user.getFirstName()
        );

        this.logger.info('Password reset email sent', { 
          userId: user.getId(),
          email: user.getEmail().getValue()
        });

        const response: ResetPasswordResponse = {
          message: 'If an account with that email exists, a password reset link has been sent.',
          emailSent: true
        };

        this.logExecutionEnd(response);
        return response;

      } catch (emailError) {
        this.logger.error('Failed to send password reset email', emailError as Error, {
          userId: user.getId()
        });
        
        return {
          message: 'If an account with that email exists, a password reset link has been sent.',
          emailSent: false
        };
      }

    } catch (error) {
      this.logExecutionError(error as Error, request);
      throw error;
    }
  }
}

export class ConfirmResetPasswordUseCase extends BaseUseCase<ConfirmResetPasswordRequest, ConfirmResetPasswordResponse> {
  constructor(
    private userRepository: IUserRepository,
    private tokenRepository: ITokenRepository,
    private passwordService: IPasswordService
  ) {
    super();
  }

  async execute(request: ConfirmResetPasswordRequest): Promise<ConfirmResetPasswordResponse> {
    this.logExecutionStart(request);

    try {
      // Validate input
      this.validateRequest(request);

      const token = await this.tokenRepository.findByValue(request.token);
      
      if (!token || !token.isValid() || token.getType() !== TokenType.RESET_PASSWORD) {
        this.logger.warn('Invalid password reset token used', { token: request.token });
        throw new InvalidTokenException('reset password');
      }

      const user = await this.userRepository.findById(token.getUserId());
      if (!user) {
        this.logger.error('Password reset token references non-existent user', { 
          tokenId: token.getId(),
          userId: token.getUserId()
        });
        throw new UserNotFoundException(token.getUserId());
      }

      // Update password
      const newPassword = new Password(request.newPassword);
      const hashedPassword = await this.passwordService.hash(newPassword);
      user.updatePassword(new Password(hashedPassword, true));

      // Mark token as used
      token.markAsUsed();

      await this.userRepository.update(user);
      await this.tokenRepository.update(token);

      const response: ConfirmResetPasswordResponse = {
        message: 'Password has been successfully reset',
        success: true
      };

      this.logger.info('Password reset completed successfully', { 
        userId: user.getId()
      });

      this.logExecutionEnd(response);
      return response;

    } catch (error) {
      this.logExecutionError(error as Error, request);
      throw error;
    }
  }

  private validateRequest(request: ConfirmResetPasswordRequest): void {
    if (!request.token?.trim()) {
      throw new Error('Reset token is required');
    }

    if (!request.newPassword) {
      throw new Error('New password is required');
    }

    const passwordValidation = ValidationUtils.isValidPassword(request.newPassword);
    if (!passwordValidation.valid) {
      throw new Error(`Password validation failed: ${passwordValidation.errors.join(', ')}`);
    }
  }
}