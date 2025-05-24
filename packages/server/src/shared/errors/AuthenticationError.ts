import { BaseError } from './BaseError';

export class AuthenticationError extends BaseError {
  public readonly code: string;
  public readonly details?: Record<string, any>;

  constructor(
    message: string = 'Authentication failed',
    code: string = 'AUTH_FAILED',
    details?: Record<string, any>
  ) {
    super(message, 401, true, details);
    
    this.code = code;
    this.details = details;
  }

  public static invalidCredentials(): AuthenticationError {
    return new AuthenticationError(
      'Invalid email or password',
      'INVALID_CREDENTIALS'
    );
  }

  public static tokenExpired(): AuthenticationError {
    return new AuthenticationError(
      'Authentication token has expired',
      'TOKEN_EXPIRED'
    );
  }

  public static invalidToken(): AuthenticationError {
    return new AuthenticationError(
      'Invalid authentication token',
      'INVALID_TOKEN'
    );
  }

  public static missingToken(): AuthenticationError {
    return new AuthenticationError(
      'Authentication token is required',
      'MISSING_TOKEN'
    );
  }

  public static accountLocked(): AuthenticationError {
    return new AuthenticationError(
      'Account has been locked due to multiple failed login attempts',
      'ACCOUNT_LOCKED'
    );
  }

  public toJSON(): Record<string, any> {
    return {
      ...super.toJSON(),
      code: this.code,
      details: this.details
    };
  }
}