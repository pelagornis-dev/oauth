import bcrypt from 'bcrypt';
import { IPasswordService } from '../../app/interfaces/services/IPasswordService';
import { Password } from '../../domain/value-objects/Password';
import { environment } from '../config/environment';
import { logger } from '../../shared/utils/logger';
import { CryptoUtils } from '../../shared/utils/crypto';
import { BaseError } from '../../shared/errors/BaseError';
import { HTTP_STATUS } from '../../shared/constants/httpStatus';
import { CONFIG } from '../../shared/constants/config';

class PasswordServiceError extends BaseError {
  constructor(message: string, operation: string, originalError?: Error) {
    super(message, HTTP_STATUS.INTERNAL_SERVER_ERROR, false, {
      operation,
      originalError: originalError?.message
    });
  }
}

export class BcryptPasswordService implements IPasswordService {
  private readonly rounds = environment.BCRYPT_ROUNDS;
  private readonly logger = logger.setContext({ service: 'BcryptPasswordService' });

  constructor() {
    this.logger.info('Password service initialized', { 
      rounds: this.rounds,
      recommended: CONFIG.BCRYPT_ROUNDS 
    });

    if (this.rounds < CONFIG.BCRYPT_ROUNDS) {
      this.logger.warn('Bcrypt rounds below recommended value', {
        current: this.rounds,
        recommended: CONFIG.BCRYPT_ROUNDS
      });
    }
  }

  async hash(password: Password): Promise<string> {
    try {
      this.logger.debug('Hashing password');
      const startTime = Date.now();
      
      const hashedPassword = await bcrypt.hash(password.getValue(), this.rounds);
      
      const duration = Date.now() - startTime;
      this.logger.debug('Password hashed successfully', { 
        duration: `${duration}ms`,
        rounds: this.rounds 
      });

      return hashedPassword;
    } catch (error) {
      this.logger.error('Error hashing password', { error });
      throw new PasswordServiceError(
        'Failed to hash password',
        'hash',
        error instanceof Error ? error : undefined
      );
    }
  }

  async compare(password: Password, hashedPassword: string): Promise<boolean> {
    try {
      this.logger.debug('Comparing password with hash');
      const startTime = Date.now();
      
      const isMatch = await bcrypt.compare(password.getValue(), hashedPassword);
      
      const duration = Date.now() - startTime;
      this.logger.debug('Password comparison completed', { 
        isMatch,
        duration: `${duration}ms`
      });

      return isMatch;
    } catch (error) {
      this.logger.error('Error comparing password', { error });
      throw new PasswordServiceError(
        'Failed to compare password',
        'compare',
        error instanceof Error ? error : undefined
      );
    }
  }

  async generateRandomPassword(length: number = 16): Promise<string> {
    try {
      this.logger.debug('Generating random password', { length });
      
      // Use CryptoUtils for secure password generation
      const password = CryptoUtils.generatePassword(length);
      
      this.logger.debug('Random password generated successfully', { length });
      
      return password;
    } catch (error) {
      this.logger.error('Error generating random password', { length, error });
      throw new PasswordServiceError(
        'Failed to generate random password',
        'generateRandomPassword',
        error instanceof Error ? error : undefined
      );
    }
  }

  // Additional utility methods
  async validatePasswordStrength(password: string): Promise<{ valid: boolean; score: number; feedback: string[] }> {
    const feedback: string[] = [];
    let score = 0;

    // Length check
    if (password.length >= 8) score += 1;
    else feedback.push('Password should be at least 8 characters long');

    if (password.length >= 12) score += 1;
    else if (password.length >= 8) feedback.push('Consider using 12+ characters for better security');

    // Character variety checks
    if (/[a-z]/.test(password)) score += 1;
    else feedback.push('Add lowercase letters');

    if (/[A-Z]/.test(password)) score += 1;
    else feedback.push('Add uppercase letters');

    if (/\d/.test(password)) score += 1;
    else feedback.push('Add numbers');

    if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) score += 1;
    else feedback.push('Add special characters');

    // Common patterns check
    if (/(.)\1{2,}/.test(password)) {
      score -= 1;
      feedback.push('Avoid repeating characters');
    }

    const valid = score >= 4;
    
    this.logger.debug('Password strength validated', { 
      score, 
      maxScore: 6, 
      valid,
      feedbackCount: feedback.length 
    });

    return { valid, score, feedback };
  }
}