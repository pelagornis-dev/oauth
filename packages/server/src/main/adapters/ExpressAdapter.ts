import express, { Application } from 'express';
import compression from 'compression';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import session from 'express-session';
import MongoStore from 'connect-mongo';
import { AppRoutes } from '../../presentation/routes';
import { environment } from '../../infrastructure/config/environment';
import { authConfig } from '../../infrastructure/config/auth';
import { logger } from '../../shared/utils/logger';

export class ExpressAdapter {
  private app: Application;
  private readonly logger = logger.setContext({ adapter: 'ExpressAdapter' });

  constructor(private appRoutes: AppRoutes) {
    this.app = express();
    this.setupMiddlewares();
    this.setupRoutes();
  }

  private setupMiddlewares(): void {
    this.logger.info('Setting up Express middlewares');

    // Trust proxy (for proper IP detection behind load balancers)
    this.app.set('trust proxy', 1);

    // Security middleware
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
          connectSrc: ["'self'"],
          fontSrc: ["'self'"],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          frameSrc: ["'none'"],
        },
      },
      crossOriginEmbedderPolicy: false,
    }));

    // CORS configuration
    this.app.use(cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (mobile apps, Postman, etc.)
        if (!origin) return callback(null, true);
        
        const allowedOrigins = [
          environment.FRONTEND_URL,
          'http://localhost:3000',
          'http://localhost:4321',
          'http://localhost:5173'
        ];
        
        if (allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          this.logger.warn('CORS request blocked', { origin });
          callback(new Error('Not allowed by CORS'));
        }
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
      exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset']
    }));

    // Compression
    this.app.use(compression({
      filter: (req, res) => {
        if (req.headers['x-no-compression']) {
          return false;
        }
        return compression.filter(req, res);
      },
      threshold: 1024 // Only compress if bigger than 1KB
    }));

    // Body parsing
    this.app.use(express.json({ 
      limit: '10mb',
      verify: (req, res, buf) => {
        // Store raw body for webhook verification if needed
        (req as any).rawBody = buf;
      }
    }));
    this.app.use(express.urlencoded({ 
      extended: true, 
      limit: '10mb' 
    }));

    // Session configuration
    this.app.use(session({
      secret: authConfig.session.secret,
      name: authConfig.session.name,
      resave: authConfig.session.resave,
      saveUninitialized: authConfig.session.saveUninitialized,
      store: MongoStore.create({
        mongoUrl: environment.MONGODB_URI,
        touchAfter: 24 * 3600, // lazy session update
        ttl: 24 * 60 * 60 // 1 day
      }),
      cookie: {
        ...authConfig.session.cookie,
        secure: environment.NODE_ENV === 'production'
      }
    }));

    // Logging middleware (only in development)
    if (environment.NODE_ENV === 'development') {
      this.app.use(morgan('combined', {
        stream: {
          write: (message: string) => {
            this.logger.info(message.trim(), { source: 'morgan' });
          }
        }
      }));
    }

    // Health check endpoint (before all other routes)
    this.app.get('/ping', (req, res) => {
      res.status(200).json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        service: 'Pelagornis OAuth API'
      });
    });

    this.logger.info('Express middlewares configured successfully');
  }

  private setupRoutes(): void {
    this.logger.info('Setting up Express routes');

    // Mount application routes
    this.app.use('/', this.appRoutes.getRouter());

    this.logger.info('Express routes configured successfully');
  }

  public getApp(): Application {
    return this.app;
  }

  public async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const server = this.app.listen(environment.PORT, () => {
          this.logger.info('Express server started', {
            port: environment.PORT,
            environment: environment.NODE_ENV,
            nodeVersion: process.version
          });
          resolve();
        });

        // Handle server errors
        server.on('error', (error: any) => {
          if (error.code === 'EADDRINUSE') {
            this.logger.error(`Port ${environment.PORT} is already in use`);
          } else {
            this.logger.error('Server error', { error: error.message });
          }
          reject(error);
        });

        // Graceful shutdown handling
        process.on('SIGTERM', () => {
          this.logger.info('SIGTERM received, shutting down gracefully');
          server.close(() => {
            this.logger.info('Express server closed');
            process.exit(0);
          });
        });

        process.on('SIGINT', () => {
          this.logger.info('SIGINT received, shutting down gracefully');
          server.close(() => {
            this.logger.info('Express server closed');
            process.exit(0);
          });
        });

      } catch (error) {
        this.logger.error('Failed to start Express server', { error });
        reject(error);
      }
    });
  }
}
