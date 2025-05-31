import { Request, Response, NextFunction } from 'express';
import { AuthValidator } from '../validators/A';
import { UserValidator } from '../validators/UserValidator';
import { CommonValidator } from '../validators/CommonValidator';
import { ValidationError } from '../../shared/errors/ValidationError';
import { logger } from '../../shared/utils/logger';

type ValidatorType = 'auth' | 'user' | 'common';
type ValidatorMethod = string;

interface ValidationOptions {
  validator: ValidatorType;
  method: ValidatorMethod;
  source?: 'body' | 'params' | 'query';
}

export class ValidationMiddleware {
  private readonly logger = logger.setContext({ middleware: 'ValidationMiddleware' });

  constructor(
    private authValidator: AuthValidator,
    private userValidator: UserValidator,
    private commonValidator: CommonValidator
  ) {}

  public validate = (options: ValidationOptions) => {
    return (req: Request, res: Response, next: NextFunction): void => {
      try {
        const { validator, method, source = 'body' } = options;
        const data = source === 'body' ? req.body : 
                    source === 'params' ? req.params : 
                    req.query;

        this.logger.debug('Validating request data', {
          path: req.path,
          method: req.method,
          validator,
          validatorMethod: method,
          source
        });

        let validatorInstance;
        switch (validator) {
          case 'auth':
            validatorInstance = this.authValidator;
            break;
          case 'user':
            validatorInstance = this.userValidator;
            break;
          case 'common':
            validatorInstance = this.commonValidator;
            break;
          default:
            throw new Error(`Unknown validator type: ${validator}`);
        }

        const validatorFunction = (validatorInstance as any)[method];
        if (!validatorFunction || typeof validatorFunction !== 'function') {
          throw new Error(`Validator method ${method} not found in ${validator} validator`);
        }

        const result = validatorFunction.call(validatorInstance, data);

        if (!result.isValid) {
          this.logger.warn('Validation failed', {
            path: req.path,
            errors: result.errors,
            data: this.sanitizeLogData(data)
          });

          if (result.errors.length === 1) {
            const error = result.errors[0];
            throw ValidationError.create(
              error.field,
              error.value,
              error.constraint,
              error.message
            );
          } else {
            throw ValidationError.createMultiple(result.errors);
          }
        }

        this.logger.debug('Validation passed', {
          path: req.path,
          validator,
          method
        });

        next();
      } catch (error) {
        this.logger.error('Validation middleware error', {
          path: req.path,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        next(error);
      }
    };
  };

  // Convenience methods for common validations
  public validateLogin = this.validate({ validator: 'auth', method: 'validateLogin' });
  public validateRegister = this.validate({ validator: 'auth', method: 'validateRegister' });
  public validateForgotPassword = this.validate({ validator: 'auth', method: 'validateForgotPassword' });
  public validateResetPassword = this.validate({ validator: 'auth', method: 'validateResetPassword' });
  public validateRefreshToken = this.validate({ validator: 'auth', method: 'validateRefreshToken' });
  
  public validateUpdateProfile = this.validate({ validator: 'user', method: 'validateUpdateProfile' });
  public validateChangePassword = this.validate({ validator: 'user', method: 'validateChangePassword' });
  
  public validateObjectId = (paramName: string = 'id') => {
    return this.validate({ 
      validator: 'common', 
      method: 'validateObjectId',
      source: 'params'
    });
  };

  public validatePagination = this.validate({ 
    validator: 'common', 
    method: 'validatePagination',
    source: 'query'
  });

  private sanitizeLogData(data: any): any {
    const sensitiveFields = ['password', 'confirmPassword', 'currentPassword', 'newPassword'];
    const sanitized = { ...data };
    
    sensitiveFields.forEach(field => {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    });
    
    return sanitized;
  }
}