import { DateUtils } from '../../shared/utils/date';

export class TokenValue {
  private readonly value: string;
  private readonly expiresAt: Date;

  constructor(value: string, expiresAt: Date) {
    if (!value || value.trim().length === 0) {
      throw new Error('Token value cannot be empty');
    }
    if (expiresAt <= new Date()) {
      throw new Error('Token expiration date must be in the future');
    }
    this.value = value;
    this.expiresAt = expiresAt;
  }

  getValue(): string {
    return this.value;
  }

  getExpiresAt(): Date {
    return this.expiresAt;
  }

  isExpired(): boolean {
    return DateUtils.isExpired(this.expiresAt);
  }

  equals(other: TokenValue): boolean {
    return this.value === other.value;
  }
}