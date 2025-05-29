import { Container } from 'inversify';
import { IPasswordService } from '../../app/interfaces/services/IPasswordService';
import { ITokenService } from '../../app/interfaces/services/ITokenService';
import { IEmailService } from '../../app/interfaces/services/IEmailService';
import { ILocalizationService } from '../../app/interfaces/services/ILocalizationService';
import { TYPES } from '../di/types';
import { logger } from '../../shared/utils/logger';

export class ServiceFactory {
  private readonly logger = logger.setContext({ factory: 'ServiceFactory' });

  constructor(private container: Container) {}

  public async initialize(): Promise<void> {
    this.logger.info('Initializing services');

    try {
      // Initialize localization service
      const localizationService = this.container.get<ILocalizationService>(TYPES.ILocalizationService);
      // Localization service initializes itself in constructor

      // Verify email service health
      const emailService = this.container.get<IEmailService>(TYPES.IEmailService);
      const emailHealth = await emailService.healthCheck();
      
      if (!emailHealth.healthy) {
        this.logger.warn('Email service health check failed', { details: emailHealth.details });
      }

      this.logger.info('Services initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize services', { error });
      throw error;
    }
  }

  public getPasswordService(): IPasswordService {
    return this.container.get<IPasswordService>(TYPES.IPasswordService);
  }

  public getTokenService(): ITokenService {
    return this.container.get<ITokenService>(TYPES.ITokenService);
  }

  public getEmailService(): IEmailService {
    return this.container.get<IEmailService>(TYPES.IEmailService);
  }

  public getLocalizationService(): ILocalizationService {
    return this.container.get<ILocalizationService>(TYPES.ILocalizationService);
  }
}