import { PassportConfig } from '../../infrastructure/auth/passport/PassportConfig';
import { Application } from 'express';
import passport from 'passport';
import { logger } from '../../shared/utils/logger';

export class PassportAdapter {
  private readonly logger = logger.setContext({ adapter: 'PassportAdapter' });

  constructor(
    private app: Application,
    private passportConfig: PassportConfig
  ) {}

  public initialize(): void {
    this.logger.info('Initializing Passport adapter');

    try {
      // Initialize passport configuration
      this.passportConfig.initialize();

      // Initialize passport middleware
      this.app.use(passport.initialize());
      this.app.use(passport.session());

      // Add custom passport middleware for debugging
      this.app.use((req, res, next) => {
        if (req.isAuthenticated && req.isAuthenticated()) {
          this.logger.debug('User authenticated via session', { 
            userId: req.user?.id,
            path: req.path 
          });
        }
        next();
      });

      this.logger.info('Passport adapter initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize Passport adapter', { error });
      throw error;
    }
  }

  public getPassportInstance() {
    return this.passportConfig.getPassportInstance();
  }
}