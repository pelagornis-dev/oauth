import fs from 'fs/promises';
import path from 'path';
import nodemailer from 'nodemailer';
import { IEmailService, EmailTemplate } from '../../../application/interfaces/services/IEmailService';
import { environment } from '../../config/environment';
import { logger } from '../../../shared/utils/logger';
import { ValidationUtils } from '../../../shared/utils/validation';
import { BaseError } from '../../../shared/errors/BaseError';
import { HTTP_STATUS } from '../../../shared/constants/httpStatus';
import { CONFIG } from '../../../shared/constants/config';

class EmailServiceError extends BaseError {
  constructor(message: string, operation: string, originalError?: Error) {
    super(message, HTTP_STATUS.INTERNAL_SERVER_ERROR, false, {
      operation,
      originalError: originalError?.message
    });
  }
}

export class NodemailerEmailService implements IEmailService {
  private transporter: nodemailer.Transporter;
  private templatesPath: string;
  private readonly logger = logger.setContext({ service: 'NodemailerEmailService' });
  private emailQueue: Array<{ to: string; template: EmailTemplate; retries: number }> = [];
  private isProcessingQueue = false;

  constructor() {
    this.templatesPath = path.join(__dirname, 'templates');
    this.initializeTransporter();
    this.startQueueProcessor();
  }

  private initializeTransporter(): void {
    try {
      this.transporter = nodemailer.createTransporter({
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
        rateLimit: 5 // 5 emails per second
      });

      this.logger.info('Nodemailer transporter initialized', {
        host: environment.SMTP_HOST,
        port: environment.SMTP_PORT,
        secure: environment.SMTP_PORT === 465
      });

      // Verify connection
      this.verifyConnection();
    } catch (error) {
      this.logger.error('Failed to initialize email transporter', { error });
      throw new EmailServiceError(
        'Failed to initialize email service',
        'constructor',
        error instanceof Error ? error : undefined
      );
    }
  }

  private async verifyConnection(): Promise<void> {
    try {
      await this.transporter.verify();
      this.logger.info('Email transporter verified successfully');
    } catch (error) {
      this.logger.error('Email transporter verification failed', { error });
      // Don't throw here as it might be a temporary issue
    }
  }

  async sendVerificationEmail(to: string, token: string, userFirstName: string): Promise<void> {
    try {
      if (!ValidationUtils.isValidEmail(to)) {
        throw new EmailServiceError('Invalid recipient email address', 'sendVerificationEmail');
      }

      this.logger.info('Sending verification email', { to, firstName: userFirstName });

      const verifyUrl = `${environment.FRONTEND_URL}/verify-email?token=${token}`;
      const htmlTemplate = await this.loadTemplate('verification-email.html');
      const html = this.replaceTemplateVariables(htmlTemplate, {
        firstName: userFirstName,
        verifyUrl: verifyUrl
      });

      const template: EmailTemplate = {
        subject: 'Welcome! Please verify your email address',
        html,
        text: `Hi ${userFirstName}, please verify your email by visiting: ${verifyUrl}`
      };

      await this.queueEmail(to, template);
      
      this.logger.info('Verification email queued successfully', { to });
    } catch (error) {
      this.logger.error('Error sending verification email', { to, error });
      throw new EmailServiceError(
        'Failed to send verification email',
        'sendVerificationEmail',
        error instanceof Error ? error : undefined
      );
    }
  }

  async sendPasswordResetEmail(to: string, token: string, userFirstName: string): Promise<void> {
    try {
      if (!ValidationUtils.isValidEmail(to)) {
        throw new EmailServiceError('Invalid recipient email address', 'sendPasswordResetEmail');
      }

      this.logger.info('Sending password reset email', { to, firstName: userFirstName });

      const resetUrl = `${environment.FRONTEND_URL}/reset-password?token=${token}`;
      const htmlTemplate = await this.loadTemplate('reset-password-email.html');
      const html = this.replaceTemplateVariables(htmlTemplate, {
        firstName: userFirstName,
        resetUrl: resetUrl
      });

      const template: EmailTemplate = {
        subject: 'Reset your password',
        html,
        text: `Hi ${userFirstName}, reset your password by visiting: ${resetUrl}`
      };

      await this.queueEmail(to, template);
      
      this.logger.info('Password reset email queued successfully', { to });
    } catch (error) {
      this.logger.error('Error sending password reset email', { to, error });
      throw new EmailServiceError(
        'Failed to send password reset email',
        'sendPasswordResetEmail',
        error instanceof Error ? error : undefined
      );
    }
  }

  async sendWelcomeEmail(to: string, userFirstName: string): Promise<void> {
    try {
      if (!ValidationUtils.isValidEmail(to)) {
        throw new EmailServiceError('Invalid recipient email address', 'sendWelcomeEmail');
      }

      this.logger.info('Sending welcome email', { to, firstName: userFirstName });

      const dashboardUrl = `${environment.FRONTEND_URL}/dashboard`;
      const htmlTemplate = await this.loadTemplate('welcome-email.html');
      const html = this.replaceTemplateVariables(htmlTemplate, {
        firstName: userFirstName,
        dashboardUrl: dashboardUrl
      });

      const template: EmailTemplate = {
        subject: 'Welcome to Pelagornis OAuth!',
        html,
        text: `Hi ${userFirstName}, welcome to Pelagornis OAuth! Your account has been successfully verified.`
      };

      await this.queueEmail(to, template);
      
      this.logger.info('Welcome email queued successfully', { to });
    } catch (error) {
      this.logger.error('Error sending welcome email', { to, error });
      throw new EmailServiceError(
        'Failed to send welcome email',
        'sendWelcomeEmail',
        error instanceof Error ? error : undefined
      );
    }
  }

  async sendEmail(to: string, template: EmailTemplate): Promise<void> {
    await this.queueEmail(to, template);
  }

  private async queueEmail(to: string, template: EmailTemplate): Promise<void> {
    this.emailQueue.push({ to, template, retries: 0 });
    this.logger.debug('Email added to queue', { 
      to, 
      subject: template.subject,
      queueLength: this.emailQueue.length 
    });
  }

  private startQueueProcessor(): void {
    setInterval(async () => {
      if (!this.isProcessingQueue && this.emailQueue.length > 0) {
        await this.processEmailQueue();
      }
    }, CONFIG.EMAIL_QUEUE_DELAY);
  }

  private async processEmailQueue(): Promise<void> {
    if (this.isProcessingQueue || this.emailQueue.length === 0) return;

    this.isProcessingQueue = true;
    
    try {
      const emailItem = this.emailQueue.shift();
      if (!emailItem) return;

      await this.sendEmailDirectly(emailItem.to, emailItem.template);
      
      this.logger.debug('Email sent successfully from queue', { 
        to: emailItem.to,
        subject: emailItem.template.subject
      });
    } catch (error) {
      this.logger.error('Error processing email queue', { error });
      
      // Re-queue with retry logic
      const emailItem = this.emailQueue[0];
      if (emailItem && emailItem.retries < CONFIG.MAX_EMAIL_RETRIES) {
        emailItem.retries++;
        this.emailQueue.push(emailItem);
        this.logger.info('Email re-queued for retry', { 
          to: emailItem.to,
          retries: emailItem.retries 
        });
      }
    } finally {
      this.isProcessingQueue = false;
    }
  }

  private async sendEmailDirectly(to: string, template: EmailTemplate): Promise<void> {
    try {
      const info = await this.transporter.sendMail({
        from: `${environment.EMAIL_FROM_NAME} <${environment.EMAIL_FROM}>`,
        to,
        subject: template.subject,
        html: template.html,
        text: template.text
      });

      this.logger.info('Email sent successfully', { 
        to,
        subject: template.subject,
        messageId: info.messageId
      });
    } catch (error) {
      this.logger.error('Failed to send email directly', { to, error });
      throw error;
    }
  }

  private async loadTemplate(templateName: string): Promise<string> {
    try {
      const templatePath = path.join(this.templatesPath, templateName);
      const template = await fs.readFile(templatePath, 'utf-8');
      
      this.logger.debug('Email template loaded', { templateName });
      return template;
    } catch (error) {
      this.logger.error('Failed to load email template', { templateName, error });
      throw new EmailServiceError(
        `Failed to load email template: ${templateName}`,
        'loadTemplate',
        error instanceof Error ? error : undefined
      );
    }
  }

  private replaceTemplateVariables(template: string, variables: Record<string, string>): string {
    let result = template;
    
    Object.keys(variables).forEach(key => {
      const placeholder = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
      result = result.replace(placeholder, variables[key]);
    });

    this.logger.debug('Template variables replaced', { 
      variableCount: Object.keys(variables).length 
    });

    return result;
  }

  // Health check method
  async healthCheck(): Promise<{ healthy: boolean; details: any }> {
    try {
      await this.transporter.verify();
      return {
        healthy: true,
        details: {
          queueLength: this.emailQueue.length,
          isProcessing: this.isProcessingQueue,
          host: environment.SMTP_HOST,
          port: environment.SMTP_PORT
        }
      };
    } catch (error) {
      return {
        healthy: false,
        details: {
          error: error instanceof Error ? error.message : 'Unknown error',
          queueLength: this.emailQueue.length
        }
      };
    }
  }
}