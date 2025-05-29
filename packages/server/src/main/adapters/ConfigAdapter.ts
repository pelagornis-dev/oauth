import { DatabaseConfig } from '../../infrastructure/config/database';
import { EmailConfig } from '../../infrastructure/config/email';
import { AuthConfig } from '../../infrastructure/config/auth';
import { logger } from '../../shared/utils/logger';

export class ConfigAdapter {
  private readonly logger = logger.setContext({ adapter: 'ConfigAdapter' });

  public async initialize(): Promise<void> {
    this.logger.info('Initializing configuration adapter');

    try {
      // Validate all configurations
      this.validateConfigurations();
      
      this.logger.info('Configuration adapter initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize configuration adapter', { error });
      throw error;
    }
  }

  private validateConfigurations(): void {
    this.logger.info('Validating configurations');

    try {
      // Validate database configuration
      DatabaseConfig.validate();
      this.logger.debug('Database configuration validated');

      // Validate email configuration
      EmailConfig.validate();
      this.logger.debug('Email configuration validated');

      // Validate auth configuration
      AuthConfig.validate();
      this.logger.debug('Auth configuration validated');

      this.logger.info('All configurations validated successfully');
    } catch (error) {
      this.logger.error('Configuration validation failed', { error });
      throw error;
    }
  }

  public getEnvironmentInfo(): {
    nodeEnv: string;
    nodeVersion: string;
    platform: string;
    arch: string;
    memory: {
      total: string;
      free: string;
      used: string;
    };
  } {
    const memoryUsage = process.memoryUsage();
    
    return {
      nodeEnv: process.env.NODE_ENV || 'development',
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      memory: {
        total: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)} MB`,
        free: `${Math.round((memoryUsage.heapTotal - memoryUsage.heapUsed) / 1024 / 1024)} MB`,
        used: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)} MB`
      }
    };
  }
}