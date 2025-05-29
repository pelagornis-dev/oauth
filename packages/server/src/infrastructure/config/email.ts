import { environment } from './environment';
import { CONFIG } from '../../shared/constants/config';

export const emailConfig = {
  nodemailer: {
    host: environment.SMTP_HOST,
    port: environment.SMTP_PORT,
    secure: environment.SMTP_PORT === 465,
    auth: {
      user: environment.SMTP_USER,
      pass: environment.SMTP_PASS
    },
    pool: true,
    maxConnections: 5,
    maxMessages: 100,
    rateLimit: 5
  },
  ses: {
    region: environment.AWS_REGION,
    credentials: {
      accessKeyId: environment.AWS_ACCESS_KEY_ID,
      secretAccessKey: environment.AWS_SECRET_ACCESS_KEY
    },
    sendingRate: 14 // emails per second
  },
  from: {
    email: environment.EMAIL_FROM,
    name: environment.EMAIL_FROM_NAME
  },
  templates: {
    verification: 'verification-email.html',
    resetPassword: 'reset-password-email.html',
    welcome: 'welcome-email.html'
  },
  queue: {
    delay: CONFIG.EMAIL_QUEUE_DELAY,
    maxRetries: CONFIG.MAX_EMAIL_RETRIES
  }
} as const;

export class EmailConfig {
  static validate(): void {
    if (!environment.EMAIL_FROM) {
      throw new Error('EMAIL_FROM is required');
    }

    if (environment.EMAIL_PROVIDER === 'nodemailer') {
      if (!environment.SMTP_HOST || !environment.SMTP_USER || !environment.SMTP_PASS) {
        throw new Error('SMTP configuration is incomplete for nodemailer');
      }
    }

    if (environment.EMAIL_PROVIDER === 'ses') {
      if (!environment.AWS_REGION || !environment.AWS_ACCESS_KEY_ID || !environment.AWS_SECRET_ACCESS_KEY) {
        throw new Error('AWS configuration is incomplete for SES');
      }
    }
  }
}