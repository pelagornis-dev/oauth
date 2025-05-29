import { Strategy as PassportGoogleStrategy, StrategyOptions } from 'passport-google-oauth20';
import { IUserRepository } from '../../../../app/interfaces/repositories/IUserRepository';
import { User } from '../../../../domain/entities/User';
import { Email } from '../../../../domain/value-objects/Email';
import { AuthProvider } from '../../../../domain/enums/AuthProvider';
import { UserStatus } from '../../../../domain/enums/UserStatus';
import { authConfig } from '../../../config/auth';
import { CryptoUtils } from '../../../../shared/utils/crypto';
import { logger } from '../../../../shared/utils/logger';

interface GoogleProfile {
  id: string;
  emails: Array<{ value: string; verified: boolean }>;
  name: {
    givenName: string;
    familyName: string;
  };
  photos: Array<{ value: string }>;
}

export class GoogleStrategy extends PassportGoogleStrategy {
  private readonly logger = logger.setContext({ strategy: 'GoogleStrategy' });

  constructor(private userRepository: IUserRepository) {
    const options: StrategyOptions = {
      clientID: authConfig.oauth.google.clientId,
      clientSecret: authConfig.oauth.google.clientSecret,
      callbackURL: authConfig.oauth.google.callbackUrl,
      scope: authConfig.oauth.google.scope
    };

    super(options, async (accessToken, refreshToken, profile, done) => {
      try {
        await this.authenticate(profile as GoogleProfile, done);
      } catch (error) {
        done(error);
      }
    });
  }

  private async authenticate(
    profile: GoogleProfile,
    done: (error: any, user?: any, info?: any) => void
  ): Promise<void> {
    try {
      this.logger.info('Attempting Google OAuth authentication', { 
        googleId: profile.id,
        email: profile.emails[0]?.value 
      });

      // Extract user data from Google profile
      const googleEmail = profile.emails[0]?.value;
      const firstName = profile.name.givenName;
      const lastName = profile.name.familyName;

      if (!googleEmail || !firstName || !lastName) {
        this.logger.warn('Incomplete Google profile data', { profile });
        return done(null, false, { message: 'Incomplete profile information from Google' });
      }

      const email = new Email(googleEmail);

      // Check if user already exists with this Google ID
      let user = await this.userRepository.findByProviderInfo(
        AuthProvider.GOOGLE,
        profile.id
      );

      if (user) {
        // User exists with Google provider
        this.logger.info('Existing Google user found', { userId: user.getId() });
        
        // Check if account is suspended
        if (user.getStatus() === UserStatus.SUSPENDED) {
          this.logger.warn('Suspended Google user attempted login', { userId: user.getId() });
          return done(null, false, { message: 'Account has been suspended' });
        }

        // Update last login time (this would be handled in the use case)
        const userData = {
          id: user.getId(),
          email: user.getEmail().getValue(),
          firstName: user.getFirstName(),
          lastName: user.getLastName(),
          provider: user.getProvider(),
          emailVerified: user.isEmailVerified()
        };

        return done(null, userData);
      }

      // Check if user exists with same email but different provider
      const existingUser = await this.userRepository.findByEmail(email);
      if (existingUser) {
        this.logger.warn('User exists with different provider', { 
          email: googleEmail,
          existingProvider: existingUser.getProvider() 
        });
        return done(null, false, { 
          message: `Account already exists with ${existingUser.getProvider()} provider. Please log in using ${existingUser.getProvider()}.`,
          code: 'ACCOUNT_EXISTS_DIFFERENT_PROVIDER'
        });
      }

      // Create new user with Google provider
      this.logger.info('Creating new Google user', { email: googleEmail });
      
      const newUser = new User(
        CryptoUtils.generateUUID(),
        email,
        firstName,
        lastName,
        AuthProvider.GOOGLE,
        undefined, // No password for OAuth users
        profile.id
      );

      // Google users are automatically verified
      (newUser as any).emailVerified = true;
      (newUser as any).status = UserStatus.ACTIVE;

      // Save new user
      const savedUser = await this.userRepository.save(newUser);

      this.logger.info('New Google user created successfully', { userId: savedUser.getId() });

      const userData = {
        id: savedUser.getId(),
        email: savedUser.getEmail().getValue(),
        firstName: savedUser.getFirstName(),
        lastName: savedUser.getLastName(),
        provider: savedUser.getProvider(),
        emailVerified: savedUser.isEmailVerified()
      };

      return done(null, userData);
    } catch (error) {
      this.logger.error('Google OAuth authentication error', { 
        googleId: profile?.id,
        error 
      });
      return done(error);
    }
  }
}