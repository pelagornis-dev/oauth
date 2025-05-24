import { TokenValue } from '../value-objects/TokenValue';
import { TokenType } from '../enums/TokenType';
import { DateUtils } from '../../shared/utils/date';
import { logger } from '../../shared/utils/logger';

export class Token {
  private id: string;
  private userId: string;
  private type: TokenType;
  private value: TokenValue;
  private used: boolean;
  private createdAt: Date;

  constructor(
    id: string,
    userId: string,
    type: TokenType,
    value: TokenValue
  ) {
    this.id = id;
    this.userId = userId;
    this.type = type;
    this.value = value;
    this.used = false;
    this.createdAt = new Date();

    logger.debug('Token created', {
      tokenId: this.id,
      userId: this.userId,
      type: this.type,
      expiresAt: this.value.getExpiresAt()
    });
  }

  // Getters
  getId(): string { return this.id; }
  getUserId(): string { return this.userId; }
  getType(): TokenType { return this.type; }
  getValue(): TokenValue { return this.value; }
  isUsed(): boolean { return this.used; }
  getCreatedAt(): Date { return this.createdAt; }

  // Business Logic
  markAsUsed(): void {
    if (this.used) {
      throw new Error('Token has already been used');
    }
    if (this.value.isExpired()) {
      throw new Error('Cannot use expired token');
    }
    
    logger.info('Token marked as used', {
      tokenId: this.id,
      userId: this.userId,
      type: this.type
    });
    
    this.used = true;
  }

  isValid(): boolean {
    const valid = !this.used && !this.value.isExpired();
    
    if (!valid) {
      logger.debug('Token validation failed', {
        tokenId: this.id,
        used: this.used,
        expired: this.value.isExpired()
      });
    }
    
    return valid;
  }

  getTokenString(): string {
    return this.value.getValue();
  }

  getExpiresAt(): Date {
    return this.value.getExpiresAt();
  }

  getRemainingTime(): string {
    if (this.value.isExpired()) {
      return 'Expired';
    }
    return DateUtils.getTimeDifference(new Date(), this.value.getExpiresAt());
  }

  willExpireSoon(thresholdMinutes: number = 5): boolean {
    const now = new Date();
    const expiresAt = this.value.getExpiresAt();
    const thresholdMs = thresholdMinutes * 60 * 1000;
    
    return (expiresAt.getTime() - now.getTime()) <= thresholdMs;
  }
}