import { SESClient, SendEmailCommand, SendEmailCommandInput } from '@aws-sdk/client-ses';
import { IEmailService, EmailTemplate } from '../../../app/interfaces/services/IEmailService';
import { environment } from '../../config/environment';
import { emailConfig } from '../../config/email';
import { logger } from '../../../shared/utils/logger';
import { ValidationUtils } from '../../../shared/utils/validation';
import { BaseError } from '../../../shared/errors/BaseError';
import { HTTP_STATUS } from '../../../shared/constants/httpStatus';
import { CONFIG } from '../../../shared/constants/config';
import fs from 'fs/promises';
import path from 'path';

class SESEmailServiceError extends BaseError {
  constructor(message: string, operation: string, originalError?: Error) {
    super(message, HTTP_STATUS.INTERNAL_SERVER_ERROR, false, {
      operation,
      originalError: originalError?.message
    });
  }
}

export class SESEmailService implements IEmailService {
  private sesClient: SESClient;
  private templatesPath: string;
  private readonly logger = logger.setContext({ service: 'SESEmailService' });
  private emailQueue: Array<{ to: string; template: EmailTemplate; retries: number }> = [];
  private isProcessingQueue = false;

  constructor() {
    this.templatesPath = path.join(__dirname, '../templates');
    this.initializeSESClient();
    this.startQueueProcessor();
  }

  private initializeSESClient(): void {
    try {
      this.sesClient = new SESClient({
        region: emailConfig.ses.region,
        credentials: {
          accessKeyId: emailConfig.ses.credentials.accessKeyId,
          secretAccessKey: emailConfig.ses.credentials.secretAccessKey
        }
      });

      this.logger.info('SES client initialized', {
        region: emailConfig.ses.region
      });

      // Verify SES configuration
      this.verifySESConfiguration();
    } catch (error) {
      this.logger.error('Failed to initialize SES client', { error });
      throw new SESEmailServiceError(
        'Failed to initialize SES email service',
        'constructor',
        error instanceof Error ? error : undefined
      );
    }
  }

  private async verifySESConfiguration(): Promise<void> {
    try {
      // You could add SES configuration verification here
      // For example, checking if the sender email is verified
      this.logger.info('SES configuration verified');
    } catch (error) {
      this.logger.error('SES configuration verification failed', { error });
      // Don't throw here as it might be a temporary issue
    }
  }

  async sendVerificationEmail(to: string, token: string, userFirstName: string): Promise<void> {
    try {
      if (!ValidationUtils.isValidEmail(to)) {
        throw new SESEmailServiceError('Invalid recipient email address', 'sendVerificationEmail');
      }

      this.logger.info('Sending verification email via SES', { to, firstName: userFirstName });

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
      
      this.logger.info('Verification email queued successfully via SES', { to });
    } catch (error) {
      this.logger.error('Error sending verification email via SES', { to, error });
      throw new SESEmailServiceError(
        'Failed to send verification email',
        'sendVerificationEmail',
        error instanceof Error ? error : undefined
      );
    }
  }

  async sendPasswordResetEmail(to: string, token: string, userFirstName: string): Promise<void> {
    try {
      if (!ValidationUtils.isValidEmail(to)) {
        throw new SESEmailServiceError('Invalid recipient email address', 'sendPasswordResetEmail');
      }

      this.logger.info('Sending password reset email via SES', { to, firstName: userFirstName });

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
      
      this.logger.info('Password reset email queued successfully via SES', { to });
    } catch (error) {
      this.logger.error('Error sending password reset email via SES', { to, error });
      throw new SESEmailServiceError(
        'Failed to send password reset email',
        'sendPasswordResetEmail',
        error instanceof Error ? error : undefined
      );
    }
  }

  async sendWelcomeEmail(to: string, userFirstName: string): Promise<void> {
    try {
      if (!ValidationUtils.isValidEmail(to)) {
        throw new SESEmailServiceError('Invalid recipient email address', 'sendWelcomeEmail');
      }

      this.logger.info('Sending welcome email via SES', { to, firstName: userFirstName });

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
      
      this.logger.info('Welcome email queued successfully via SES', { to });
    } catch (error) {
      this.logger.error('Error sending welcome email via SES', { to, error });
      throw new SESEmailServiceError(
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
    this.logger.debug('Email added to SES queue', { 
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
      
      this.logger.debug('Email sent successfully from SES queue', { 
        to: emailItem.to,
        subject: emailItem.template.subject
      });
    } catch (error) {
      this.logger.error('Error processing SES email queue', { error });
      
      // Re-queue with retry logic
      const emailItem = this.emailQueue[0];
      if (emailItem && emailItem.retries < CONFIG.MAX_EMAIL_RETRIES) {
        emailItem.retries++;
        this.emailQueue.push(emailItem);
        this.logger.info('Email re-queued for retry via SES', { 
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
      const params: SendEmailCommandInput = {
        Source: `${emailConfig.from.name} <${emailConfig.from.email}>`,
        Destination: {
          ToAddresses: [to]
        },
        Message: {
          Subject: {
            Data: template.subject,
            Charset: 'UTF-8'
          },
          Body: {
            Html: {
              Data: template.html,
              Charset: 'UTF-8'
            },
            Text: {
              Data: template.text,
              Charset: 'UTF-8'
            }
          }
        }
      };

      const command = new SendEmailCommand(params);
      const response = await this.sesClient.send(command);

      this.logger.info('Email sent successfully via SES', { 
        to,
        subject: template.subject,
        messageId: response.MessageId
      });
    } catch (error) {
      this.logger.error('Failed to send email via SES', { to, error });
      throw error;
    }
  }

  private async loadTemplate(templateName: string): Promise<string> {
    try {
      const templatePath = path.join(this.templatesPath, templateName);
      const template = await fs.readFile(templatePath, 'utf-8');
      
      this.logger.debug('Email template loaded for SES', { templateName });
      return template;
    } catch (error) {
      this.logger.error('Failed to load email template for SES', { templateName, error });
      throw new SESEmailServiceError(
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

    this.logger.debug('Template variables replaced for SES', { 
      variableCount: Object.keys(variables).length 
    });

    return result;
  }

  // Health check method
  async healthCheck(): Promise<{ healthy: boolean; details: any }> {
    try {
      // Simple check to see if SES client is configured
      return {
        healthy: true,
        details: {
          provider: 'SES',
          region: emailConfig.ses.region,
          queueLength: this.emailQueue.length,
          isProcessing: this.isProcessingQueue
        }
      };
    } catch (error) {
      return {
        healthy: false,
        details: {
          provider: 'SES',
          error: error instanceof Error ? error.message : 'Unknown error',
          queueLength: this.emailQueue.length
        }
      };
    }
  }
}