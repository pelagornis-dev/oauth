import { Request, Response, NextFunction } from 'express';
import { BaseError } from '../../shared/errors/BaseError';
import { ValidationError } from '../../shared/errors/ValidationError';
import { AuthenticationError } from '../../shared/errors/AuthenticationError';
import { AuthorizationError } from '../../shared/errors/AuthorizationError';
import { ErrorSerializer } from '../serializers/ErrorSerializer';
import { ILocalizationService } from '../../app/interfaces/services/ILocalizationService';
import { logger } from '../../shared/utils/logger';
import { HTTP_STATUS } from '../../shared/constants/httpStatus';
import { ErrorResponse } from '../../shared/types/response';
import { environment } from '../../infrastructure/config/environment';

export class ErrorHandlingMiddleware {
  private readonly logger = logger.setContext({ middleware: 'ErrorHandlingMiddleware' });

  constructor(
    private errorSerializer: ErrorSerializer,
    private localizationService: ILocalizationService
  ) {}

  public handle = (
    error: Error,
    req: Request,
    res: Response,
    next: NextFunction
  ): void => {
    const locale = req.locale || 'en';
    const requestId = req.requestId;

    this.logger.error('Request error', {
      error: error.message,
      stack: error.stack,
      path: req.path,
      method: req.method,
      userAgent: req.get('User-Agent'),
      ip: req.ip,
      userId: req.user?.id,
      requestId
    });

    let statusCode = HTTP_STATUS.INTERNAL_SERVER_ERROR;
    let message = this.localizationService.t('errors.general.server_error', locale);
    let code = 'INTERNAL_ERROR';
    let details: any = undefined;

    if (error instanceof BaseError) {
      statusCode = error.statusCode;
      message = error.message;
      details = error.context;

      // Map specific error types to localized messages
      if (error instanceof ValidationError) {
        code = 'VALIDATION_ERROR';
        if (error.field) {
          message = this.localizationService.t('errors.validation.required', locale);
        }
      } else if (error instanceof AuthenticationError) {
        code = 'AUTHENTICATION_ERROR';
        if (error.message.includes('expired')) {
          message = this.localizationService.t('errors.auth.token_expired', locale);
        } else if (error.message.includes('invalid')) {
          message = this.localizationService.t('errors.auth.invalid_credentials', locale);
        }
      } else if (error instanceof AuthorizationError) {
        code = 'AUTHORIZATION_ERROR';
        message = this.localizationService.t('errors.general.forbidden', locale);
      }
    } else if (error.name === 'ValidationError') {
      // Mongoose validation error
      statusCode = HTTP_STATUS.BAD_REQUEST;
      code = 'VALIDATION_ERROR';
      message = this.extractValidationMessage(error, locale);
    } else if (error.name === 'CastError') {
      // Mongoose cast error (invalid ObjectId, etc.)
      statusCode = HTTP_STATUS.BAD_REQUEST;
      code = 'INVALID_FORMAT';
      message = 'Invalid data format';
    } else if (error.message.includes('E11000')) {
      // MongoDB duplicate key error
      statusCode = HTTP_STATUS.CONFLICT;
      code = 'DUPLICATE_RESOURCE';
      message = 'Resource already exists';
    } else if (error.name === 'JsonWebTokenError') {
      statusCode = HTTP_STATUS.UNAUTHORIZED;
      code = 'INVALID_TOKEN';
      message = this.localizationService.t('errors.auth.token_invalid', locale);
    } else if (error.name === 'TokenExpiredError') {
      statusCode = HTTP_STATUS.UNAUTHORIZED;
      code = 'TOKEN_EXPIRED';
      message = this.localizationService.t('errors.auth.token_expired', locale);
    } else if (error.name === 'SyntaxError' && error.message.includes('JSON')) {
      statusCode = HTTP_STATUS.BAD_REQUEST;
      code = 'INVALID_JSON';
      message = 'Invalid JSON format';
    }

    const errorResponse: ErrorResponse = {
      success: false,
      error: {
        code,
        message,
        statusCode,
        timestamp: new Date().toISOString(),
        ...(details && { details }),
        ...(environment.NODE_ENV === 'development' && { 
          stack: error.stack,
          originalMessage: error.message 
        })
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId
      }
    };

    // Log critical errors with more detail
    if (statusCode >= 500) {
      this.logger.error('Critical server error', {
        error: error.message,
        stack: error.stack,
        statusCode,
        requestId
      });
    }

    res.status(statusCode).json(errorResponse);
  };

  private extractValidationMessage(error: any, locale: string): string {
    if (error.errors) {
      const firstError = Object.values(error.errors)[0] as any;
      if (firstError?.message) {
        return firstError.message;
      }
    }
    return this.localizationService.t('errors.validation.required', locale);
  }

  // 404 handler for undefined routes
  public notFound = (req: Request, res: Response, next: NextFunction): void => {
    const locale = req.locale || 'en';
    
    this.logger.warn('Route not found', {
      path: req.path,
      method: req.method,
      userAgent: req.get('User-Agent'),
      ip: req.ip
    });

    const errorResponse: ErrorResponse = {
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: this.localizationService.t('errors.general.not_found', locale),
        statusCode: HTTP_STATUS.NOT_FOUND,
        timestamp: new Date().toISOString()
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.requestId
      }
    };

    res.status(HTTP_STATUS.NOT_FOUND).json(errorResponse);
  };
}