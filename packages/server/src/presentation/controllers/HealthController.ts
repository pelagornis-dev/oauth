import { Request, Response, NextFunction } from 'express';
import { DatabaseConnection } from '../../infrastructure/database/mongoose/connection';
import { NodemailerEmailService } from '../../infrastructure/email/nodemailer/NodemailerEmailService';
import { SESEmailService } from '../../infrastructure/email/ses/SESEmailService';
import { LocalizationService } from '../../infrastructure/localization/LocalizationService';
import { logger } from '../../shared/utils/logger';
import { HTTP_STATUS } from '../../shared/constants/httpStatus';
import { HealthCheckResponse } from '../../shared/types/response';
import { environment } from '../../infrastructure/config/environment';

export class HealthController {
  private readonly logger = logger.setContext({ controller: 'HealthController' });

  constructor(
    private databaseConnection: DatabaseConnection,
    private emailService: NodemailerEmailService | SESEmailService,
    private localizationService: LocalizationService
  ) {}

  public async healthCheck(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      this.logger.debug('Health check requested');

      const startTime = Date.now();
      
      // Check database
      const isDatabaseHealthy = this.databaseConnection.isConnectedToDatabase();
      
      // Check email service
      const emailHealth = await this.emailService.healthCheck();
      
      // Check localization service
      const localizationHealth = this.localizationService.healthCheck();
      
      // Get system metrics
      const memoryUsage = process.memoryUsage();
      const cpuUsage = process.cpuUsage();
      const uptime = process.uptime();

      const responseTime = Date.now() - startTime;
      
      const overallStatus = isDatabaseHealthy && emailHealth.healthy && localizationHealth.healthy 
        ? 'OK' 
        : 'ERROR';

      const response: HealthCheckResponse = {
        status: overallStatus,
        timestamp: new Date().toISOString(),
        uptime: Math.floor(uptime),
        environment: environment.NODE_ENV,
        version: process.env.npm_package_version || '1.0.0',
        services: {
          database: isDatabaseHealthy ? 'healthy' : 'unhealthy',
          memory: {
            rss: `${Math.round(memoryUsage.rss / 1024 / 1024)} MB`,
            heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)} MB`,
            heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)} MB`,
            external: `${Math.round(memoryUsage.external / 1024 / 1024)} MB`
          },
          cpu: {
            user: cpuUsage.user,
            system: cpuUsage.system
          }
        },
        responseTime: `${responseTime}ms`
      };

      this.logger.info('Health check completed', { 
        status: overallStatus,
        responseTime: `${responseTime}ms`
      });

      const statusCode = overallStatus === 'OK' ? HTTP_STATUS.OK : HTTP_STATUS.SERVICE_UNAVAILABLE;
      res.status(statusCode).json(response);

    } catch (error) {
      this.logger.error('Health check failed', { error });
      
      const response: HealthCheckResponse = {
        status: 'ERROR',
        timestamp: new Date().toISOString(),
        uptime: Math.floor(process.uptime()),
        environment: environment.NODE_ENV,
        version: process.env.npm_package_version || '1.0.0',
        services: {
          database: 'unknown',
          memory: {
            rss: 'unknown',
            heapTotal: 'unknown',
            heapUsed: 'unknown',
            external: 'unknown'
          },
          cpu: {
            user: 0,
            system: 0
          }
        },
        error: error instanceof Error ? error.message : 'Unknown error'
      };

      res.status(HTTP_STATUS.SERVICE_UNAVAILABLE).json(response);
    }
  }

  public async liveness(req: Request, res: Response): Promise<void> {
    // Simple liveness probe - just check if the process is running
    res.status(HTTP_STATUS.OK).json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      message: 'Service is alive'
    });
  }

  public async readiness(req: Request, res: Response): Promise<void> {
    try {
      // Check if service is ready to handle requests
      const isDatabaseReady = this.databaseConnection.isConnectedToDatabase();
      
      if (isDatabaseReady) {
        res.status(HTTP_STATUS.OK).json({
          status: 'OK',
          timestamp: new Date().toISOString(),
          message: 'Service is ready'
        });
      } else {
        res.status(HTTP_STATUS.SERVICE_UNAVAILABLE).json({
          status: 'NOT_READY',
          timestamp: new Date().toISOString(),
          message: 'Service is not ready - database not connected'
        });
      }
    } catch (error) {
      res.status(HTTP_STATUS.SERVICE_UNAVAILABLE).json({
        status: 'ERROR',
        timestamp: new Date().toISOString(),
        message: 'Service readiness check failed'
      });
    }
  }
}