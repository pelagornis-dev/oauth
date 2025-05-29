import { Strategy as PassportLocalStrategy } from 'passport-local';
import { IUserRepository } from '../../../../app/interfaces/repositories/IUserRepository';
import { IPasswordService } from '../../../../app/interfaces/services/IPasswordService';
import { Email } from '../../../../domain/value-objects/Email';
import { Password } from '../../../../domain/value-objects/Password';
import { UserStatus } from '../../../../domain/enums/UserStatus';
import { AuthenticationError } from '../../../../shared/errors/AuthenticationError';
import { logger } from '../../../../shared/utils/logger';

export class LocalStrategy extends PassportLocalStrategy {
  private readonly logger = logger.setContext({ strategy: 'LocalStrategy' });

  constructor(
    private userRepository: IUserRepository,
    private passwordService: IPasswordService
  ) {
    super(
      {
        usernameField: 'email',
        passwordField: 'password'
      },
      async (email: string, password: string, done) => {
        try {
          await this.authenticate(email, password, done);
        } catch (error) {
          done(error);
        }
      }
    );
  }

  private async authenticate(
    emailString: string,
    passwordString: string,
    done: (error: any, user?: any, info?: any) => void
  ): Promise<void> {
    try {
      this.logger.info('Attempting local authentication', { email: emailString });

      // Validate input
      if (!emailString || !passwordString) {
        this.logger.warn('Missing email or password');
        return done(null, false, { message: 'Email and password are required' });
      }

      const email = new Email(emailString);
      const password = new Password(passwordString);

      // Find user by email
      const user = await this.userRepository.findByEmail(email);
      if (!user) {
        this.logger.warn('User not found', { email: emailString });
        return done(null, false, { message: 'Invalid email or password' });
      }

      // Check if user account is active
      if (user.getStatus() === UserStatus.SUSPENDED) {
        this.logger.warn('User account suspended', { userId: user.getId() });
        return done(null, false, { message: 'Account has been suspended' });
      }

      // For local users, password is required
      if (!user.getPassword()) {
        this.logger.warn('User has no password set', { userId: user.getId() });
        return done(null, false, { message: 'Account created via social login. Please use social login or reset password.' });
      }

      // Verify password
      const isPasswordValid = await this.passwordService.compare(
        password,
        user.getPassword()!.getValue()
      );

      if (!isPasswordValid) {
        this.logger.warn('Invalid password', { userId: user.getId() });
        return done(null, false, { message: 'Invalid email or password' });
      }

      // Check if email is verified (for pending users)
      if (user.getStatus() === UserStatus.PENDING && !user.isEmailVerified()) {
        this.logger.warn('Email not verified', { userId: user.getId() });
        return done(null, false, { 
          message: 'Please verify your email address before logging in',
          code: 'EMAIL_NOT_VERIFIED'
        });
      }

      this.logger.info('Local authentication successful', { userId: user.getId() });

      // Return user data for session
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
      this.logger.error('Local authentication error', { email: emailString, error });
      
      if (error instanceof AuthenticationError) {
        return done(null, false, { message: error.message });
      }
      
      return done(error);
    }
  }
}