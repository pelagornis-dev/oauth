import { Router } from 'express';
import passport from 'passport';
import { AuthController } from '../controllers/AuthController';
import { ValidationMiddleware } from '../middlewares/ValidationMiddleware';
import { RateLimitMiddleware } from '../middlewares/RateLimitMiddleware';
import { AuthenticationMiddleware } from '../middlewares/AuthenticationMiddleware';

export class AuthRoutes {
  private router: Router;

  constructor(
    private authController: AuthController,
    private validationMiddleware: ValidationMiddleware,
    private rateLimitMiddleware: RateLimitMiddleware,
    private authenticationMiddleware: AuthenticationMiddleware
  ) {
    this.router = Router();
    this.initializeRoutes();
  }

  private initializeRoutes(): void {
    // Local authentication routes
    this.router.post(
      '/login',
      this.rateLimitMiddleware.auth,
      this.validationMiddleware.validateLogin,
      this.authController.login.bind(this.authController)
    );

    this.router.post(
      '/register',
      this.rateLimitMiddleware.auth,
      this.validationMiddleware.validateRegister,
      this.authController.register.bind(this.authController)
    );

    this.router.post(
      '/logout',
      this.authenticationMiddleware.authenticate,
      this.authController.logout.bind(this.authController)
    );

    // Token management
    this.router.post(
      '/refresh',
      this.rateLimitMiddleware.general,
      this.validationMiddleware.validateRefreshToken,
      this.authController.refreshToken.bind(this.authController)
    );

    // Email verification
    this.router.get(
      '/verify-email',
      this.rateLimitMiddleware.emailVerification,
      this.authController.verifyEmail.bind(this.authController)
    );

    // Password reset
    this.router.post(
      '/forgot-password',
      this.rateLimitMiddleware.passwordReset,
      this.validationMiddleware.validateForgotPassword,
      this.authController.forgotPassword.bind(this.authController)
    );

    this.router.post(
      '/reset-password',
      this.rateLimitMiddleware.passwordReset,
      this.validationMiddleware.validateResetPassword,
      this.authController.resetPassword.bind(this.authController)
    );

    // Google OAuth routes
    this.router.get(
      '/google',
      this.rateLimitMiddleware.auth,
      passport.authenticate('google', { scope: ['profile', 'email'] })
    );

    this.router.get(
      '/google/callback',
      passport.authenticate('google', { failureRedirect: '/auth/failure' }),
      this.authController.googleAuth.bind(this.authController)
    );

    // OAuth failure route
    this.router.get('/failure', (req, res) => {
      res.status(401).json({
        success: false,
        error: {
          code: 'OAUTH_FAILED',
          message: 'OAuth authentication failed',
          statusCode: 401,
          timestamp: new Date().toISOString()
        }
      });
    });

    // Health check for auth service
    this.router.get('/health', (req, res) => {
      res.status(200).json({
        status: 'OK',
        service: 'auth',
        timestamp: new Date().toISOString()
      });
    });
  }

  public getRouter(): Router {
    return this.router;
  }
}