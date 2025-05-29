import { ValidationUtils } from '../../shared/utils/validation';
import { logger } from '../../shared/utils/logger';
import { ValidationResult, ValidationError } from './AuthValidator';

export interface UpdateProfileRequest {
  firstName?: string;
  lastName?: string;
  email?: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
  confirmPassword?: string;
}

export class UserValidator {
  private readonly logger = logger.setContext({ validator: 'UserValidator' });

  public validateUpdateProfile(data: UpdateProfileRequest): ValidationResult {
    const errors: ValidationError[] = [];

    try {
      // At least one field must be provided
      if (!data.firstName && !data.lastName && !data.email) {
        errors.push({
          field: 'root',
          value: data,
          constraint: 'required',
          message: 'At least one field must be provided for update'
        });
        return { isValid: false, errors };
      }

      // First name validation (if provided)
      if (data.firstName !== undefined) {
        if (typeof data.firstName !== 'string') {
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
      }

      // Last name validation (if provided)
      if (data.lastName !== undefined) {
        if (typeof data.lastName !== 'string') {
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
      }

      // Email validation (if provided)
      if (data.email !== undefined) {
        if (typeof data.email !== 'string') {
          errors.push({
            field: 'email',
            value: data.email,
            constraint: 'type',
            message: 'Email must be a string'
          });
        } else if (!ValidationUtils.isValidEmail(data.email)) {
          errors.push({
            field: 'email',
            value: data.email,
            constraint: 'format',
            message: 'Invalid email format'
          });
        }
      }

      this.logger.debug('Update profile validation completed', {
        hasFirstName: data.firstName !== undefined,
        hasLastName: data.lastName !== undefined,
        hasEmail: data.email !== undefined,
        isValid: errors.length === 0,
        errorCount: errors.length
      });

      return { isValid: errors.length === 0, errors };
    } catch (error) {
      this.logger.error('Error during update profile validation', { error });
      throw error;
    }
  }

  public validateChangePassword(data: ChangePasswordRequest): ValidationResult {
    const errors: ValidationError[] = [];

    try {
      // Current password validation
      if (!data.currentPassword) {
        errors.push({
          field: 'currentPassword',
          value: '[REDACTED]',
          constraint: 'required',
          message: 'Current password is required'
        });
      } else if (typeof data.currentPassword !== 'string') {
        errors.push({
          field: 'currentPassword',
          value: '[REDACTED]',
          constraint: 'type',
          message: 'Current password must be a string'
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

        // Check if new password is different from current
        if (data.currentPassword && data.newPassword === data.currentPassword) {
          errors.push({
            field: 'newPassword',
            value: '[REDACTED]',
            constraint: 'different',
            message: 'New password must be different from current password'
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

      this.logger.debug('Change password validation completed', {
        hasCurrentPassword: !!data.currentPassword,
        hasNewPassword: !!data.newPassword,
        hasConfirmPassword: data.confirmPassword !== undefined,
        isValid: errors.length === 0
      });

      return { isValid: errors.length === 0, errors };
    } catch (error) {
      this.logger.error('Error during change password validation', { error });
      throw error;
    }
  }

  public validateUserId(userId: string): ValidationResult {
    const errors: ValidationError[] = [];

    try {
      if (!userId) {
        errors.push({
          field: 'userId',
          value: userId,
          constraint: 'required',
          message: 'User ID is required'
        });
      } else if (typeof userId !== 'string') {
        errors.push({
          field: 'userId',
          value: userId,
          constraint: 'type',
          message: 'User ID must be a string'
        });
      } else if (!ValidationUtils.isValidObjectId(userId)) {
        errors.push({
          field: 'userId',
          value: userId,
          constraint: 'format',
          message: 'Invalid user ID format'
        });
      }

      return { isValid: errors.length === 0, errors };
    } catch (error) {
      this.logger.error('Error during user ID validation', { error });
      throw error;
    }
  }
}