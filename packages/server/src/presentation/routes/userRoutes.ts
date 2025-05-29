import { Router } from 'express';
import { UserController } from '../controllers/UserController';
import { ValidationMiddleware } from '../middlewares/ValidationMiddleware';
import { RateLimitMiddleware } from '../middlewares/RateLimitMiddleware';
import { AuthenticationMiddleware } from '../middlewares/AuthenticationMiddleware';
import { AuthorizationMiddleware } from '../middlewares/AuthorizationMiddleware';

export class UserRoutes {
  private router: Router;

  constructor(
    private userController: UserController,
    private validationMiddleware: ValidationMiddleware,
    private rateLimitMiddleware: RateLimitMiddleware,
    private authenticationMiddleware: AuthenticationMiddleware,
    private authorizationMiddleware: AuthorizationMiddleware
  ) {
    this.router = Router();
    this.initializeRoutes();
  }

  private initializeRoutes(): void {
    // All user routes require authentication
    this.router.use(this.authenticationMiddleware.authenticate);

    // Get current user profile
    this.router.get(
      '/profile',
      this.rateLimitMiddleware.api,
      this.userController.getProfile.bind(this.userController)
    );

    // Update current user profile
    this.router.put(
      '/profile',
      this.rateLimitMiddleware.api,
      this.validationMiddleware.validateUpdateProfile,
      this.userController.updateProfile.bind(this.userController)
    );

    // Change password
    this.router.put(
      '/password',
      this.rateLimitMiddleware.auth,
      this.validationMiddleware.validateChangePassword,
      this.userController.changePassword.bind(this.userController)
    );

    // Delete account
    this.router.delete(
      '/account',
      this.rateLimitMiddleware.auth,
      this.authorizationMiddleware.requireEmailVerified,
      this.userController.deleteAccount.bind(this.userController)
    );

    // Get user by ID (admin or own profile only)
    this.router.get(
      '/:id',
      this.rateLimitMiddleware.api,
      this.validationMiddleware.validateObjectId('id'),
      this.authorizationMiddleware.requireOwnership('id'),
      this.userController.getProfile.bind(this.userController)
    );

    // Health check for user service
    this.router.get('/health', (req, res) => {
      res.status(200).json({
        status: 'OK',
        service: 'user',
        timestamp: new Date().toISOString()
      });
    });
  }

  public getRouter(): Router {
    return this.router;
  }
}