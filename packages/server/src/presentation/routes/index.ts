import { Router, Request, Response } from 'express';
import { AuthRoutes } from './authRoutes';
import { UserRoutes } from './userRoutes';
import { HealthController } from '../controllers/HealthController';
import { LocalizationMiddleware } from '../middlewares/LocalizationMiddleware';
import { ErrorHandlingMiddleware } from '../middlewares/ErrorHandlingMiddleware';
import { RateLimitMiddleware } from '../middlewares/RateLimitMiddleware';
import { logger } from '../../shared/utils/logger';
import { CONFIG } from '../../shared/constants/config';
import { CryptoUtils } from '../../shared/utils/crypto';

export class AppRoutes {
  private router: Router;
  private readonly logger = logger.setContext({ service: 'AppRoutes' });

  constructor(
    private authRoutes: AuthRoutes,
    private userRoutes: UserRoutes,
    private healthController: HealthController,
    private localizationMiddleware: LocalizationMiddleware,
    private errorHandlingMiddleware: ErrorHandlingMiddleware,
    private rateLimitMiddleware: RateLimitMiddleware
  ) {
    this.router = Router();
    this.initializeGlobalMiddleware();
    this.initializeRoutes();
    this.initializeErrorHandling();
  }

  private initializeGlobalMiddleware(): void {
    // Add request ID for tracking
    this.router.use((req: Request, res: Response, next) => {
      req.requestId = CryptoUtils.generateUUID();
      req.startTime = Date.now();
      
      // Log incoming request
      this.logger.info('Incoming request', {
        method: req.method,
        path: req.path,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        requestId: req.requestId
      });
      
      next();
    });

    // CORS headers
    this.router.use((req: Request, res: Response, next) => {
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
      
      if (req.method === 'OPTIONS') {
        res.sendStatus(200);
        return;
      }
      
      next();
    });

    // Security headers
    this.router.use((req: Request, res: Response, next) => {
      res.header('X-Content-Type-Options', 'nosniff');
      res.header('X-Frame-Options', 'DENY');
      res.header('X-XSS-Protection', '1; mode=block');
      res.header('Referrer-Policy', 'strict-origin-when-cross-origin');
      
      if (req.secure) {
        res.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
      }
      
      next();
    });

    // General rate limiting for all routes
    this.router.use(this.rateLimitMiddleware.general);

    // Localization
    this.router.use(this.localizationMiddleware.detectLocale);
    this.router.use(this.localizationMiddleware.addTranslationHelper);

    // Request logging with response time
    this.router.use((req: Request, res: Response, next) => {
      const originalSend = res.send;
      
      res.send = function(body) {
        const responseTime = Date.now() - (req.startTime || Date.now());
        
        logger.info('Request completed', {
          method: req.method,
          path: req.path,
          statusCode: res.statusCode,
          responseTime: `${responseTime}ms`,
          requestId: req.requestId,
          userId: req.user?.id
        });
        
        return originalSend.call(this, body);
      };
      
      next();
    });
  }

  private initializeRoutes(): void {
    // Root welcome message
    this.router.get('/', (req: Request, res: Response) => {
      res.json({
        success: true,
        message: 'Welcome to Pelagornis OAuth API',
        version: '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        timestamp: new Date().toISOString(),
        endpoints: {
          auth: `${CONFIG.API_PREFIX}/${CONFIG.API_VERSION}/auth`,
          users: `${CONFIG.API_PREFIX}/${CONFIG.API_VERSION}/users`,
          health: `${CONFIG.API_PREFIX}/${CONFIG.API_VERSION}/health`
        },
        documentation: 'https://docs.pelagornis.dev'
      });
    });

    // API versioned routes
    const apiRouter = Router();
    
    // Mount route modules
    apiRouter.use('/auth', this.authRoutes.getRouter());
    apiRouter.use('/users', this.userRoutes.getRouter());
    
    // Health check endpoints
    apiRouter.get('/health', this.healthController.healthCheck.bind(this.healthController));
    apiRouter.get('/health/live', this.healthController.liveness.bind(this.healthController));
    apiRouter.get('/health/ready', this.healthController.readiness.bind(this.healthController));

    // API status endpoint
    apiRouter.get('/status', (req: Request, res: Response) => {
      res.json({
        status: 'OK',
        service: 'Pelagornis OAuth API',
        version: '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: {
          used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
          total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024)
        }
      });
    });

    // Mount API router with versioning
    this.router.use(`${CONFIG.API_PREFIX}/${CONFIG.API_VERSION}`, apiRouter);

    // Legacy routes (redirect to versioned API)
    this.router.use('/api', (req: Request, res: Response) => {
      res.redirect(301, `${CONFIG.API_PREFIX}/${CONFIG.API_VERSION}${req.path}`);
    });
  }

  private initializeErrorHandling(): void {
    // 404 handler for undefined routes
    this.router.use(this.errorHandlingMiddleware.notFound);

    // Global error handler (must be last)
    this.router.use(this.errorHandlingMiddleware.handle);
  }

  public getRouter(): Router {
    return this.router;
  }

  // Method to get route information for debugging
  public getRouteInfo(): any {
    const routes: any[] = [];
    
    const extractRoutes = (stack: any[], basePath = '') => {
      stack.forEach((layer: any) => {
        if (layer.route) {
          // Express route
          const path = basePath + layer.route.path;
          const methods = Object.keys(layer.route.methods);
          routes.push({ path, methods });
        } else if (layer.name === 'router' && layer.handle.stack) {
          // Nested router
          const regexp = layer.regexp.toString();
          const pathMatch = regexp.match(/\^\\?\/([^\\]*)/);
          const nestedPath = pathMatch ? `/${pathMatch[1]}` : '';
          extractRoutes(layer.handle.stack, basePath + nestedPath);
        }
      });
    };

    extractRoutes(this.router.stack);
    return routes;
  }
}