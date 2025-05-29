import { Request, Response, NextFunction } from 'express';
import { logger } from '../../shared/utils/logger';
import { AuthorizationError } from '../../shared/errors/AuthorizationError';
import { AuthenticationError } from '../../shared/errors/AuthenticationError';

export class AuthorizationMiddleware {
  private readonly logger = logger.setContext({ middleware: 'AuthorizationMiddleware' });

  public requireEmailVerified = (req: Request, res: Response, next: NextFunction): void => {
    try {
      if (!req.user) {
        this.logger.warn('Authorization check without authentication', { path: req.path });
        throw AuthenticationError.missingToken();
      }

      if (!req.user.emailVerified) {
        this.logger.warn('Unverified user attempted access', { 
          userId: req.user.id,
          path: req.path 
        });
        throw AuthorizationError.emailNotVerified();
      }

      this.logger.debug('Email verification check passed', { 
        userId: req.user.id,
        path: req.path 
      });

      next();
    } catch (error) {
      next(error);
    }
  };

  public requireRoles = (allowedRoles: string[]) => {
    return (req: Request, res: Response, next: NextFunction): void => {
      try {
        if (!req.user) {
          this.logger.warn('Role authorization check without authentication', { path: req.path });
          throw AuthenticationError.missingToken();
        }

        const userRoles = req.user.roles || [];
        const hasRequiredRole = allowedRoles.some(role => userRoles.includes(role));

        if (!hasRequiredRole) {
          this.logger.warn('Insufficient roles for access', {
            userId: req.user.id,
            userRoles,
            requiredRoles: allowedRoles,
            path: req.path
          });
          throw AuthorizationError.insufficientPermissions(
            'access',
            req.path,
            allowedRoles
          );
        }

        this.logger.debug('Role authorization check passed', {
          userId: req.user.id,
          userRoles,
          path: req.path
        });

        next();
      } catch (error) {
        next(error);
      }
    };
  };

  public requirePermissions = (requiredPermissions: string[]) => {
    return (req: Request, res: Response, next: NextFunction): void => {
      try {
        if (!req.user) {
          this.logger.warn('Permission authorization check without authentication', { path: req.path });
          throw AuthenticationError.missingToken();
        }

        const userPermissions = req.user.permissions || [];
        const hasAllPermissions = requiredPermissions.every(permission => 
          userPermissions.includes(permission)
        );

        if (!hasAllPermissions) {
          this.logger.warn('Insufficient permissions for access', {
            userId: req.user.id,
            userPermissions,
            requiredPermissions,
            path: req.path
          });
          throw AuthorizationError.insufficientPermissions(
            'access',
            req.path,
            requiredPermissions
          );
        }

        this.logger.debug('Permission authorization check passed', {
          userId: req.user.id,
          userPermissions,
          path: req.path
        });

        next();
      } catch (error) {
        next(error);
      }
    };
  };

  public requireOwnership = (resourceIdParam: string = 'id') => {
    return (req: Request, res: Response, next: NextFunction): void => {
      try {
        if (!req.user) {
          this.logger.warn('Ownership authorization check without authentication', { path: req.path });
          throw AuthenticationError.missingToken();
        }

        const resourceId = req.params[resourceIdParam];
        const userId = req.user.id;

        if (resourceId !== userId) {
          this.logger.warn('User attempted to access resource they do not own', {
            userId,
            resourceId,
            path: req.path
          });
          throw AuthorizationError.resourceNotOwned();
        }

        this.logger.debug('Ownership authorization check passed', {
          userId,
          resourceId,
          path: req.path
        });

        next();
      } catch (error) {
        next(error);
      }
    };
  };
}