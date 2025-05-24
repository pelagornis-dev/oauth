import { BaseUseCase } from '../common/BaseUseCase';
import { RegisterRequestDto } from '../../dto/auth/RegisterRequestDto';
import { RegisterResponseDto } from '../../dto/auth/RegisterResponseDto';
import { IUserRepository } from '../../interfaces/repositories/IUserRepository';
import { IVerificationTokenRepository } from '../../interfaces/repositories/IVerificationTokenRepository';
import { IPasswordService } from '../../interfaces/services/IPasswordService';
import { ITokenService } from '../../interfaces/services/ITokenService';
import { IEmailService } from '../../interfaces/services/IEmailService';
import { User } from '../../../domain/entities/User';
import { VerificationToken } from '../../../domain/entities/VerificationToken';
import { Email } from '../../../domain/value-objects/Email';
import { Password } from '../../../domain/value-objects/Password';
import { TokenValue } from '../../../domain/value-objects/TokenValue';
import { AuthProvider } from '../../../domain/enums/AuthProvider';
import { UserAlreadyExistsException } from '../../../domain/exceptions/UserAlreadyExistsException';
import { ValidationUtils } from '../../../shared/utils/validation';
import { CryptoUtils } from '../../../shared/utils/crypto';
import { DateUtils } from '../../../shared/utils/date';
import { CONFIG } from '../../../shared/constants/config';

export class RegisterUseCase extends BaseUseCase<RegisterRequestDto, RegisterResponseDto> {
  constructor(
    private userRepository: IUserRepository,
    private verificationTokenRepository: IVerificationTokenRepository,
    private passwordService: IPasswordService,
    private tokenService: ITokenService,
    private emailService: IEmailService
  ) {
    super();
  }

  async execute(request: RegisterRequestDto): Promise<RegisterResponseDto> {
    this.logExecutionStart(request);

    try {
      // Validate input
      this.validateRequest(request);

      const email = new Email(request.email);
      
      // Check if user already exists
      const existingUser = await this.userRepository.findByEmail(email);
      if (existingUser) {
        this.logger.warn('Registration attempt with existing email', { email: request.email });
        throw new UserAlreadyExistsException(request.email);
      }

      // Create password
      const password = new Password(request.password);
      const hashedPassword = await this.passwordService.hash(password);

      // Create user
      const user = new User(
        CryptoUtils.generateUUID(),
        email,
        ValidationUtils.sanitizeString(request.firstName),
        ValidationUtils.sanitizeString(request.lastName),
        AuthProvider.LOCAL,
        new Password(hashedPassword, true)
      );

      const savedUser = await this.userRepository.save(user);

      // Generate verification token
      const tokenString = await this.tokenService.generateVerificationToken();
      const expiresAt = DateUtils.addTime(new Date(), CONFIG.DEFAULT_VERIFICATION_TOKEN_EXPIRY, 'seconds');
      const tokenValue = new TokenValue(tokenString, expiresAt);
      
      const verificationToken = new VerificationToken(
        CryptoUtils.generateUUID(),
        savedUser.getId(),
        savedUser.getEmail().getValue(),
        tokenValue
      );

      await this.verificationTokenRepository.save(verificationToken);

      // Send verification email
      try {
        await this.emailService.sendVerificationEmail(
          savedUser.getEmail().getValue(),
          tokenString,
          savedUser.getFirstName()
        );

        this.logger.info('Verification email sent', { 
          userId: savedUser.getId(),
          email: savedUser.getEmail().getValue()
        });
      } catch (emailError) {
        this.logger.error('Failed to send verification email', emailError as Error, {
          userId: savedUser.getId()
        });
        // Don't fail registration if email fails
      }

      const response: RegisterResponseDto = {
        user: {
          id: savedUser.getId(),
          email: savedUser.getEmail().getValue(),
          firstName: savedUser.getFirstName(),
          lastName: savedUser.getLastName(),
          emailVerified: savedUser.isEmailVerified()
        },
        message: 'Registration successful. Please check your email to verify your account.',
        verificationEmailSent: true
      };

      this.logger.info('User registration successful', { 
        userId: savedUser.getId(),
        email: savedUser.getEmail().getValue()
      });

      this.logExecutionEnd(response);
      return response;

    } catch (error) {
      this.logExecutionError(error as Error, request);
      throw error;
    }
  }

  private validateRequest(request: RegisterRequestDto): void {
    if (!ValidationUtils.isValidEmail(request.email)) {
      throw new Error('Invalid email format');
    }

    const passwordValidation = ValidationUtils.isValidPassword(request.password);
    if (!passwordValidation.valid) {
      throw new Error(`Password validation failed: ${passwordValidation.errors.join(', ')}`);
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