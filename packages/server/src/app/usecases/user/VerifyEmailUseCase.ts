import { BaseUseCase } from '../common/BaseUseCase';
import { VerifyEmailRequestDto } from '../../dto/auth/VerifyEmailRequestDto';
import { VerifyEmailResponseDto } from '../../dto/auth/VerifyEmailResponseDto';
import { IUserRepository } from '../../interfaces/repositories/IUserRepository';
import { IVerificationTokenRepository } from '../../interfaces/repositories/IVerificationTokenRepository';
import { IEmailService } from '../../interfaces/services/IEmailService';
import { InvalidTokenException } from '../../../domain/exceptions/InvalidTokenException';
import { UserNotFoundException } from '../../../domain/exceptions/UserNotFoundException';

export class VerifyEmailUseCase extends BaseUseCase<VerifyEmailRequestDto, VerifyEmailResponseDto> {
  constructor(
    private userRepository: IUserRepository,
    private verificationTokenRepository: IVerificationTokenRepository,
    private emailService: IEmailService
  ) {
    super();
  }

  async execute(request: VerifyEmailRequestDto): Promise<VerifyEmailResponseDto> {
    this.logExecutionStart(request);

    try {
      // Validate input
      if (!request.token?.trim()) {
        throw new Error('Verification token is required');
      }

      const verificationToken = await this.verificationTokenRepository.findByToken(request.token);
      
      if (!verificationToken || !verificationToken.isValid()) {
        this.logger.warn('Invalid verification token used', { token: request.token });
        throw new InvalidTokenException('verification');
      }

      const user = await this.userRepository.findById(verificationToken.getUserId());
      if (!user) {
        this.logger.error('Verification token references non-existent user', { 
          id: verificationToken.getId(),
          userId: verificationToken.getUserId()
        });
        throw new UserNotFoundException(verificationToken.getUserId());
      }

      if (user.isEmailVerified()) {
        this.logger.info('Email verification attempted for already verified user', { 
          userId: user.getId()
        });
        
        return {
          message: 'Email has already been verified',
          user: {
            id: user.getId(),
            email: user.getEmail().getValue(),
            emailVerified: true
          }
        };
      }

      // Verify the token and user
      verificationToken.verify();
      user.verifyEmail();

      await this.verificationTokenRepository.update(verificationToken);
      await this.userRepository.update(user);

      // Send welcome email
      try {
        await this.emailService.sendWelcomeEmail(
          user.getEmail().getValue(),
          user.getFirstName()
        );

        this.logger.info('Welcome email sent after verification', { userId: user.getId() });
      } catch (emailError) {
        this.logger.error('Failed to send welcome email', emailError as Error, {
          userId: user.getId()
        });
        // Don't fail verification if welcome email fails
      }

      const response: VerifyEmailResponseDto = {
        message: 'Email successfully verified',
        user: {
          id: user.getId(),
          email: user.getEmail().getValue(),
          emailVerified: true
        },
        redirectUrl: '/dashboard'
      };

      this.logger.info('Email verification successful', { 
        userId: user.getId(),
        email: user.getEmail().getValue()
      });

      this.logExecutionEnd(response);
      return response;

    } catch (error) {
      this.logExecutionError(error as Error, request);
      throw error;
    }
  }
}