import dotenv from 'dotenv';
import { logger } from '../../shared/utils/logger';
import { ValidationUtils } from '../../shared/utils/validation';

dotenv.config();

class EnvironmentValidator {
  static validate(): void {
    const requiredVars = [
      'JWT_SECRET',
      'MONGODB_URI',
      'EMAIL_FROM'
    ];

    const missing = requiredVars.filter(varName => !process.env[varName]);
    
    if (missing.length > 0) {
      logger.error('Missing required environment variables', { missing });
      throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }

    // Validate JWT secret strength
    const jwtSecret = process.env.JWT_SECRET!;
    if (jwtSecret.length < 32) {
      logger.warn('JWT secret is too short, should be at least 32 characters');
    }

    // Validate email format
    if (process.env.EMAIL_FROM && !ValidationUtils.isValidEmail(process.env.EMAIL_FROM)) {
      throw new Error('EMAIL_FROM must be a valid email address');
    }

    // Validate MongoDB URI
    if (process.env.MONGODB_URI && !process.env.MONGODB_URI.startsWith('mongodb')) {
      throw new Error('MONGODB_URI must be a valid MongoDB connection string');
    }

    logger.info('Environment validation passed');
  }
}

// Validate environment on import
EnvironmentValidator.validate();

export const environment = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '3000', 10),
  
  // Database
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/oauth-server',
  
  // JWT
  JWT_SECRET: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production',
  JWT_ACCESS_EXPIRES_IN: process.env.JWT_ACCESS_EXPIRES_IN || '1h',
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  
  // OAuth
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || '',
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET || '',
  GOOGLE_CALLBACK_URL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3000/auth/google/callback',
  
  // Email
  EMAIL_PROVIDER: (process.env.EMAIL_PROVIDER as 'nodemailer' | 'ses') || 'nodemailer',
  SMTP_HOST: process.env.SMTP_HOST || 'smtp.gmail.com',
  SMTP_PORT: parseInt(process.env.SMTP_PORT || '587', 10),
  SMTP_USER: process.env.SMTP_USER || '',
  SMTP_PASS: process.env.SMTP_PASS || '',
  EMAIL_FROM: process.env.EMAIL_FROM || 'noreply@pelagornis.dev',
  EMAIL_FROM_NAME: process.env.EMAIL_FROM_NAME || 'Pelagornis OAuth',
  
  // AWS SES (if using SES)
  AWS_REGION: process.env.AWS_REGION || 'us-east-1',
  AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID || '',
  AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY || '',
  
  // Frontend URLs
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:4321',
  DEFAULT_REDIRECT_URL: process.env.DEFAULT_REDIRECT_URL || '/dashboard',
  
  // Security
  SESSION_SECRET: process.env.SESSION_SECRET || 'your-session-secret-change-this-in-production',
  BCRYPT_ROUNDS: parseInt(process.env.BCRYPT_ROUNDS || '12', 10),
  
  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 minutes
  RATE_LIMIT_MAX_REQUESTS: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
} as const;
