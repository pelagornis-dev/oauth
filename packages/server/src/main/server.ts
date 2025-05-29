import 'reflect-metadata';
import { Application } from './app';
import { logger } from '../shared/utils/logger';
import { environment } from '../infrastructure/config/environment';

class Server {
  private app: Application;
  private readonly logger = logger.setContext({ service: 'Server' });

  constructor() {
    this.app = new Application();
  }

  public async start(): Promise<void> {
    try {
      this.logger.info('Starting Pelagornis OAuth Server', {
        environment: environment.NODE_ENV,
        port: environment.PORT,
        nodeVersion: process.version
      });

      // Initialize and start the application
      await this.app.initialize();
      await this.app.start();

      this.logger.info('🚀 Pelagornis OAuth Server started successfully!', {
        port: environment.PORT,
        environment: environment.NODE_ENV,
        pid: process.pid
      });

      // Log available endpoints
      this.logEndpoints();

    } catch (error) {
      this.logger.error('Failed to start server', { error });
      process.exit(1);
    }
  }

  private logEndpoints(): void {
    const baseUrl = `http://localhost:${environment.PORT}`;
    
    this.logger.info('🔗 Available endpoints:', {
      api: `${baseUrl}/api/v1`,
      auth: `${baseUrl}/api/v1/auth`,
      users: `${baseUrl}/api/v1/users`,
      health: `${baseUrl}/api/v1/health`,
      docs: 'https://docs.pelagornis.dev'
    });
  }

  public async stop(): Promise<void> {
    try {
      this.logger.info('Stopping server...');
      await this.app.dispose();
      this.logger.info('Server stopped successfully');
    } catch (error) {
      this.logger.error('Error stopping server', { error });
      throw error;
    }
  }
}

// Global error handlers
process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught Exception', { 
    error: error.message, 
    stack: error.stack 
  });
  process.exit(1);
});

process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
  logger.error('Unhandled Rejection', { 
    reason: reason?.message || reason,
    stack: reason?.stack
  });
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, initiating graceful shutdown');
  try {
    const server = new Server();
    await server.stop();
    process.exit(0);
  } catch (error) {
    logger.error('Error during graceful shutdown', { error });
    process.exit(1);
  }
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, initiating graceful shutdown');
  try {
    const server = new Server();
    await server.stop();
    process.exit(0);
  } catch (error) {
    logger.error('Error during graceful shutdown', { error });
    process.exit(1);
  }
});

// Start the server
const server = new Server();
server.start().catch((error) => {
  logger.error('Failed to start server', { error });
  process.exit(1);
});