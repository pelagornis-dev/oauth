import { Email } from '../value-objects/Email';
import { Password } from '../value-objects/Password';
import { UserStatus } from '../enums/UserStatus';
import { AuthProvider } from '../enums/AuthProvider';
import { DateUtils } from '../../shared/utils/date';
import { logger } from '../../shared/utils/logger';

export class User {
  private id: string;
  private email: Email;
  private password?: Password;
  private firstName: string;
  private lastName: string;
  private status: UserStatus;
  private provider: AuthProvider;
  private providerId?: string;
  private emailVerified: boolean;
  private lastLoginAt?: Date;
  private createdAt: Date;
  private updatedAt: Date;

  constructor(
    id: string,
    email: Email,
    firstName: string,
    lastName: string,
    provider: AuthProvider = AuthProvider.LOCAL,
    password?: Password,
    providerId?: string
  ) {
    this.id = id;
    this.email = email;
    this.firstName = firstName;
    this.lastName = lastName;
    this.status = UserStatus.PENDING;
    this.provider = provider;
    this.password = password;
    this.providerId = providerId;
    this.emailVerified = provider !== AuthProvider.LOCAL;
    this.createdAt = new Date();
    this.updatedAt = new Date();

    logger.debug('User entity created', {
      userId: this.id,
      email: this.email.getValue(),
      provider: this.provider
    });
  }

  // Getters
  getId(): string { return this.id; }
  getEmail(): Email { return this.email; }
  getPassword(): Password | undefined { return this.password; }
  getFirstName(): string { return this.firstName; }
  getLastName(): string { return this.lastName; }
  getFullName(): string { return `${this.firstName} ${this.lastName}`; }
  getStatus(): UserStatus { return this.status; }
  getProvider(): AuthProvider { return this.provider; }
  getProviderId(): string | undefined { return this.providerId; }
  isEmailVerified(): boolean { return this.emailVerified; }
  getLastLoginAt(): Date | undefined { return this.lastLoginAt; }
  getCreatedAt(): Date { return this.createdAt; }
  getUpdatedAt(): Date { return this.updatedAt; }

  // Business Logic
  activate(): void {
    if (this.status === UserStatus.SUSPENDED) {
      throw new Error('Cannot activate suspended user');
    }
    
    logger.info('User activated', { userId: this.id });
    this.status = UserStatus.ACTIVE;
    this.updatedAt = new Date();
  }

  suspend(): void {
    logger.warn('User suspended', { userId: this.id });
    this.status = UserStatus.SUSPENDED;
    this.updatedAt = new Date();
  }

  verifyEmail(): void {
    logger.info('Email verified for user', { userId: this.id });
    this.emailVerified = true;
    if (this.status === UserStatus.PENDING) {
      this.activate();
    }
    this.updatedAt = new Date();
  }

  updateLastLogin(): void {
    logger.debug('User login recorded', { userId: this.id });
    this.lastLoginAt = new Date();
    this.updatedAt = new Date();
  }

  updatePassword(newPassword: Password): void {
    logger.info('Password updated for user', { userId: this.id });
    this.password = newPassword;
    this.updatedAt = new Date();
  }

  updateProfile(firstName: string, lastName: string): void {
    logger.debug('Profile updated for user', { userId: this.id });
    this.firstName = firstName;
    this.lastName = lastName;
    this.updatedAt = new Date();
  }

  canLogin(): boolean {
    const canLogin = this.status === UserStatus.ACTIVE && this.emailVerified;
    
    if (!canLogin) {
      logger.warn('Login attempt blocked', {
        userId: this.id,
        status: this.status,
        emailVerified: this.emailVerified
      });
    }
    
    return canLogin;
  }

  isOAuthUser(): boolean {
    return this.provider !== AuthProvider.LOCAL;
  }

  getDisplayInfo(): string {
    return `${this.getFullName()} (${this.email.getValue()})`;
  }

  isActive(): boolean {
    return this.status === UserStatus.ACTIVE;
  }

  getAccountAge(): string {
    return DateUtils.getTimeDifference(this.createdAt);
  }

  wasLastSeenToday(): boolean {
    return this.lastLoginAt ? DateUtils.isToday(this.lastLoginAt) : false;
  }
}