import { ValidationUtils } from '../../shared/utils/validation';
import { CONFIG } from '../../shared/constants/config';
import { logger } from '../../shared/utils/logger';

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

export interface ValidationError {
  field: string;
  value: any;
  constraint: string;
  message: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  confirmPassword?: string;
  firstName: string;
  lastName: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  newPassword: string;
  confirmPassword?: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export class AuthValidator {
  private readonly logger = logger.setContext({ validator: 'AuthValidator' });

  public validateLogin(data: LoginRequest): ValidationResult {
    const errors: ValidationError[] = [];

    try {
      // Email validation
      if (!data.email) {
        errors.push({
          field: 'email',
          value: data.email,
          constraint: 'required',
          message: 'Email is required'
        });
      } else if (!ValidationUtils.isValidEmail(data.email)) {
        errors.push({
          field: 'email',
          value: data.email,
          constraint: 'format',
          message: 'Invalid email format'
        });
      }

      // Password validation
      if (!data.password) {
        errors.push({
          field: 'password',
          value: '[REDACTED]',
          constraint: 'required',
          message: 'Password is required'
        });
      } else if (typeof data.password !== 'string') {
        errors.push({
          field: 'password',
          value: '[REDACTED]',
          constraint: 'type',
          message: 'Password must be a string'
        });
      }

      this.logger.debug('Login validation completed', { 
        email: data.email,
        isValid: errors.length === 0,
        errorCount: errors.length
      });

      return { isValid: errors.length === 0, errors };
    } catch (error) {
      this.logger.error('Error during login validation', { error });
      throw error;
    }
  }

  public validateRegister(data: RegisterRequest): ValidationResult {
    const errors: ValidationError[] = [];

    try {
      // Email validation
      if (!data.email) {
        errors.push({
          field: 'email',
          value: data.email,
          constraint: 'required',
          message: 'Email is required'
        });
      } else if (!ValidationUtils.isValidEmail(data.email)) {
        errors.push({
          field: 'email',
          value: data.email,
          constraint: 'format',
          message: 'Invalid email format'
        });
      }

      // Password validation
      if (!data.password) {
        errors.push({
          field: 'password',
          value: '[REDACTED]',
          constraint: 'required',
          message: 'Password is required'
        });
      } else {
        const passwordValidation = ValidationUtils.isValidPassword(data.password);
        if (!passwordValidation.valid) {
          passwordValidation.errors.forEach(errorMsg => {
            errors.push({
              field: 'password',
              value: '[REDACTED]',
              constraint: 'strength',
              message: errorMsg
            });
          });
        }
      }

      // Confirm password validation (if provided)
      if (data.confirmPassword !== undefined) {
        if (data.password !== data.confirmPassword) {
          errors.push({
            field: 'confirmPassword',
            value: '[REDACTED]',
            constraint: 'match',
            message: 'Passwords do not match'
          });
        }
      }

      // First name validation
      if (!data.firstName) {
        errors.push({
          field: 'firstName',
          value: data.firstName,
          constraint: 'required',
          message: 'First name is required'
        });
      } else if (typeof data.firstName !== 'string') {
        errors.push({
          field: 'firstName',
          value: data.firstName,
          constraint: 'type',
          message: 'First name must be a string'
        });
      } else if (data.firstName.trim().length < 1) {
        errors.push({
          field: 'firstName',
          value: data.firstName,
          constraint: 'length',
          message: 'First name cannot be empty'
        });
      } else if (data.firstName.length > 50) {
        errors.push({
          field: 'firstName',
          value: data.firstName,
          constraint: 'length',
          message: 'First name cannot exceed 50 characters'
        });
      }

      // Last name validation
      if (!data.lastName) {
        errors.push({
          field: 'lastName',
          value: data.lastName,
          constraint: 'required',
          message: 'Last name is required'
        });
      } else if (typeof data.lastName !== 'string') {
        errors.push({
          field: 'lastName',
          value: data.lastName,
          constraint: 'type',
          message: 'Last name must be a string'
        });
      } else if (data.lastName.trim().length < 1) {
        errors.push({
          field: 'lastName',
          value: data.lastName,
          constraint: 'length',
          message: 'Last name cannot be empty'
        });
      } else if (data.lastName.length > 50) {
        errors.push({
          field: 'lastName',
          value: data.lastName,
          constraint: 'length',
          message: 'Last name cannot exceed 50 characters'
        });
      }

      this.logger.debug('Register validation completed', {
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        isValid: errors.length === 0,
        errorCount: errors.length
      });

      return { isValid: errors.length === 0, errors };
    } catch (error) {
      this.logger.error('Error during register validation', { error });
      throw error;
    }
  }

  public validateForgotPassword(data: ForgotPasswordRequest): ValidationResult {
    const errors: ValidationError[] = [];

    try {
      // Email validation
      if (!data.email) {
        errors.push({
          field: 'email',
          value: data.email,
          constraint: 'required',
          message: 'Email is required'
        });
      } else if (!ValidationUtils.isValidEmail(data.email)) {
        errors.push({
          field: 'email',
          value: data.email,
          constraint: 'format',
          message: 'Invalid email format'
        });
      }

      this.logger.debug('Forgot password validation completed', {
        email: data.email,
        isValid: errors.length === 0
      });

      return { isValid: errors.length === 0, errors };
    } catch (error) {
      this.logger.error('Error during forgot password validation', { error });
      throw error;
    }
  }

  public validateResetPassword(data: ResetPasswordRequest): ValidationResult {
    const errors: ValidationError[] = [];

    try {
      // Token validation
      if (!data.token) {
        errors.push({
          field: 'token',
          value: data.token,
          constraint: 'required',
          message: 'Reset token is required'
        });
      } else if (typeof data.token !== 'string') {
        errors.push({
          field: 'token',
          value: data.token,
          constraint: 'type',
          message: 'Token must be a string'
        });
      } else if (data.token.length < 10) {
        errors.push({
          field: 'token',
          value: data.token,
          constraint: 'length',
          message: 'Invalid token format'
        });
      }

      // New password validation
      if (!data.newPassword) {
        errors.push({
          field: 'newPassword',
          value: '[REDACTED]',
          constraint: 'required',
          message: 'New password is required'
        });
      } else {
        const passwordValidation = ValidationUtils.isValidPassword(data.newPassword);
        if (!passwordValidation.valid) {
          passwordValidation.errors.forEach(errorMsg => {
            errors.push({
              field: 'newPassword',
              value: '[REDACTED]',
              constraint: 'strength',
              message: errorMsg
            });
          });
        }
      }

      // Confirm password validation (if provided)
      if (data.confirmPassword !== undefined) {
        if (data.newPassword !== data.confirmPassword) {
          errors.push({
            field: 'confirmPassword',
            value: '[REDACTED]',
            constraint: 'match',
            message: 'Passwords do not match'
          });
        }
      }

      this.logger.debug('Reset password validation completed', {
        hasToken: !!data.token,
        isValid: errors.length === 0
      });

      return { isValid: errors.length === 0, errors };
    } catch (error) {
      this.logger.error('Error during reset password validation', { error });
      throw error;
    }
  }

  public validateRefreshToken(data: RefreshTokenRequest): ValidationResult {
    const errors: ValidationError[] = [];

    try {
      // Refresh token validation
      if (!data.refreshToken) {
        errors.push({
          field: 'refreshToken',
          value: data.refreshToken,
          constraint: 'required',
          message: 'Refresh token is required'
        });
      } else if (typeof data.refreshToken !== 'string') {
        errors.push({
          field: 'refreshToken',
          value: data.refreshToken,
          constraint: 'type',
          message: 'Refresh token must be a string'
        });
      } else if (!ValidationUtils.isValidJWTFormat(data.refreshToken)) {
        errors.push({
          field: 'refreshToken',
          value: data.refreshToken,
          constraint: 'format',
          message: 'Invalid refresh token format'
        });
      }

      this.logger.debug('Refresh token validation completed', {
        hasToken: !!data.refreshToken,
        isValid: errors.length === 0
      });

      return { isValid: errors.length === 0, errors };
    } catch (error) {
      this.logger.error('Error during refresh token validation', { error });
      throw error;
    }
  }
}