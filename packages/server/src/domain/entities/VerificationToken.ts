import { TokenValue } from '../value-objects/TokenValue';
import { ValidationUtils } from '../../shared/utils/validation';
import { DateUtils } from '../../shared/utils/date';
import { logger } from '../../shared/utils/logger';

export class VerificationToken {
  private id: string;
  private userId: string;
  private email: string;
  private token: TokenValue;
  private verified: boolean;
  private createdAt: Date;

  constructor(
    id: string,
    userId: string,
    email: string,
    token: TokenValue
  ) {
    if (!ValidationUtils.isValidEmail(email)) {
      throw new Error('Invalid email format for verification token');
    }

    this.id = id;
    this.userId = userId;
    this.email = email.toLowerCase().trim();
    this.token = token;
    this.verified = false;
    this.createdAt = new Date();

    logger.debug('Verification token created', {
      tokenId: this.id,
      userId: this.userId,
      email: this.email,
      expiresAt: this.token.getExpiresAt()
    });
  }

  // Getters
  getId(): string { return this.id; }
  getUserId(): string { return this.userId; }
  getEmail(): string { return this.email; }
  getToken(): TokenValue { return this.token; }
  isVerified(): boolean { return this.verified; }
  getCreatedAt(): Date { return this.createdAt; }

  // Business Logic
  verify(): void {
    if (this.verified) {
      throw new Error('Token has already been verified');
    }
    if (this.token.isExpired()) {
      throw new Error('Verification token has expired');
    }
    
    logger.info('Email verification completed', {
      tokenId: this.id,
      userId: this.userId,
      email: this.email
    });
    
    this.verified = true;
  }

  isValid(): boolean {
    const valid = !this.verified && !this.token.isExpired();
    
    if (!valid) {
      logger.debug('Verification token validation failed', {
        tokenId: this.id,
        verified: this.verified,
        expired: this.token.isExpired()
      });
    }
    
    return valid;
  }

  getTokenString(): string {
    return this.token.getValue();
  }

  getRemainingTime(): string {
    if (this.token.isExpired()) {
      return 'Expired';
    }
    return DateUtils.getTimeDifference(new Date(), this.token.getExpiresAt());
  }

  willExpireSoon(thresholdMinutes: number = 60): boolean {
    const now = new Date();
    const expiresAt = this.token.getExpiresAt();
    const thresholdMs = thresholdMinutes * 60 * 1000;
    
    return (expiresAt.getTime() - now.getTime()) <= thresholdMs;
  }
}