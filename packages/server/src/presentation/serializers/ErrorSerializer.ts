import { BaseError } from '../../shared/errors/BaseError';
import { ValidationError } from '../../shared/errors/ValidationError';
import { AuthenticationError } from '../../shared/errors/AuthenticationError';
import { AuthorizationError } from '../../shared/errors/AuthorizationError';
import { logger } from '../../shared/utils/logger';
import { HTTP_STATUS } from '../../shared/constants/httpStatus';
import { environment } from '../../infrastructure/config/environment';

export interface SerializedError {
  code: string;
  message: string;
  statusCode: number;
  timestamp: string;
  details?: any;
  stack?: string;
  requestId?: string;
}

export interface SerializedValidationError extends SerializedError {
  field?: string;
  value?: any;
  constraint?: string;
  violations?: Array<{
    field: string;
    value: any;
    constraint: string;
    message: string;
  }>;
}

export interface SerializedAuthError extends SerializedError {
  action?: string;
  resource?: string;
  requiredPermissions?: string[];
}

export class ErrorSerializer {
  private readonly logger = logger.setContext({ serializer: 'ErrorSerializer' });
  private readonly includeStack = environment.NODE_ENV === 'development';

  /**
   * Serialize any error for API response
   */
  public serialize(error: Error, requestId?: string): SerializedError {
    try {
      if (error instanceof BaseError) {
        return this.serializeBaseError(error, requestId);
      }

      // Handle non-BaseError instances
      return this.serializeGenericError(error, requestId);
    } catch (serializationError) {
      this.logger.error('Error during error serialization', { 
        originalError: error.message,
        serializationError: serializationError instanceof Error ? serializationError.message : 'Unknown error'
      });

      // Fallback serialization
      return {
        code: 'SERIALIZATION_ERROR',
        message: 'An error occurred while processing the request',
        statusCode: HTTP_STATUS.INTERNAL_SERVER_ERROR,
        timestamp: new Date().toISOString(),
        requestId
      };
    }
  }

  /**
   * Serialize BaseError and its subclasses
   */
  private serializeBaseError(error: BaseError, requestId?: string): SerializedError {
    const baseError: SerializedError = {
      code: this.extractErrorCode(error),
      message: error.message,
      statusCode: error.statusCode,
      timestamp: error.timestamp.toISOString(),
      requestId
    };

    if (error.context) {
      baseError.details = this.sanitizeDetails(error.context);
    }

    if (this.includeStack && error.stack) {
      baseError.stack = error.stack;
    }

    // Handle specific error types
    if (error instanceof ValidationError) {
      return this.serializeValidationError(error, baseError);
    }

    if (error instanceof AuthenticationError || error instanceof AuthorizationError) {
      return this.serializeAuthError(error, baseError);
    }

    return baseError;
  }

  /**
   * Serialize validation errors with field-specific information
   */
  private serializeValidationError(error: ValidationError, baseError: SerializedError): SerializedValidationError {
    const validationError: SerializedValidationError = {
      ...baseError,
      field: error.field,
      value: this.sanitizeValue(error.value),
      constraint: error.constraint
    };

    // Handle multiple validation violations
    if (error.context?.violations) {
      validationError.violations = error.context.violations.map((violation: any) => ({
        field: violation.field,
        value: this.sanitizeValue(violation.value),
        constraint: violation.constraint,
        message: violation.message
      }));
    }

    return validationError;
  }

  /**
   * Serialize authentication and authorization errors
   */
  private serializeAuthError(error: AuthenticationError | AuthorizationError, baseError: SerializedError): SerializedAuthError {
    const authError: SerializedAuthError = { ...baseError };

    if (error instanceof AuthorizationError) {
      authError.action = error.action;
      authError.resource = error.resource;
      authError.requiredPermissions = error.requiredPermissions;
    }

    return authError;
  }

  /**
   * Serialize generic errors (non-BaseError)
   */
  private serializeGenericError(error: Error, requestId?: string): SerializedError {
    let statusCode = HTTP_STATUS.INTERNAL_SERVER_ERROR;
    let code = 'INTERNAL_ERROR';

    // Map known error types
    if (error.name === 'ValidationError') {
      statusCode = HTTP_STATUS.BAD_REQUEST;
      code = 'VALIDATION_ERROR';
    } else if (error.name === 'CastError') {
      statusCode = HTTP_STATUS.BAD_REQUEST;
      code = 'INVALID_FORMAT';
    } else if (error.message.includes('E11000')) {
      statusCode = HTTP_STATUS.CONFLICT;
      code = 'DUPLICATE_RESOURCE';
    } else if (error.name === 'JsonWebTokenError') {
      statusCode = HTTP_STATUS.UNAUTHORIZED;
      code = 'INVALID_TOKEN';
    } else if (error.name === 'TokenExpiredError') {
      statusCode = HTTP_STATUS.UNAUTHORIZED;
      code = 'TOKEN_EXPIRED';
    }

    const serializedError: SerializedError = {
      code,
      message: error.message,
      statusCode,
      timestamp: new Date().toISOString(),
      requestId
    };

    if (this.includeStack && error.stack) {
      serializedError.stack = error.stack;
    }

    return serializedError;
  }

  /**
   * Extract error code from error instance
   */
  private extractErrorCode(error: BaseError): string {
    if (error instanceof AuthenticationError && (error as any).code) {
      return (error as any).code;
    }

    return error.constructor.name.replace(/Error$/, '').toUpperCase();
  }

  /**
   * Sanitize error details to remove sensitive information
   */
  private sanitizeDetails(details: any): any {
    if (!details || typeof details !== 'object') {
      return details;
    }

    const sanitized = { ...details };
    const sensitiveFields = ['password', 'token', 'secret', 'key', 'credential'];

    const sanitizeObject = (obj: any): any => {
      if (Array.isArray(obj)) {
        return obj.map(sanitizeObject);
      }

      if (obj && typeof obj === 'object') {
        const sanitizedObj: any = {};
        for (const [key, value] of Object.entries(obj)) {
          if (sensitiveFields.some(field => key.toLowerCase().includes(field))) {
            sanitizedObj[key] = '[REDACTED]';
          } else {
            sanitizedObj[key] = sanitizeObject(value);
          }
        }
        return sanitizedObj;
      }

      return obj;
    };

    return sanitizeObject(sanitized);
  }

  /**
   * Sanitize field values for logging/response
   */
  private sanitizeValue(value: any): any {
    if (typeof value === 'string') {
      // Check if value looks like sensitive data
      if (value.length > 20 && /^[A-Za-z0-9+/=]+$/.test(value)) {
        return '[REDACTED]';
      }
      if (value.includes('password') || value.includes('secret')) {
        return '[REDACTED]';
      }
    }

    return value;
  }

  /**
   * Create error response for client
   */
  public createErrorResponse(error: Error, requestId?: string): {
    success: false;
    error: SerializedError;
    meta: {
      timestamp: string;
      requestId?: string;
    };
  } {
    const serializedError = this.serialize(error, requestId);

    return {
      success: false,
      error: serializedError,
      meta: {
        timestamp: new Date().toISOString(),
        requestId
      }
    };
  }

  /**
   * Log error with appropriate level based on severity
   */
  public logError(error: Error, context?: any): void {
    const statusCode = error instanceof BaseError ? error.statusCode : HTTP_STATUS.INTERNAL_SERVER_ERROR;
    
    if (statusCode >= 500) {
      this.logger.error('Server error', { error: error.message, stack: error.stack, ...context });
    } else if (statusCode >= 400) {
      this.logger.warn('Client error', { error: error.message, ...context });
    } else {
      this.logger.info('Request error', { error: error.message, ...context });
    }
  }
}