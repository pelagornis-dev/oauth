import { Request, Response, NextFunction } from 'express';
import * as passport from 'passport';
import { UserRole } from '../../domain/entities/User';

export class AuthMiddleware {
  authenticate = (req: Request, res: Response, next: NextFunction): void => {
    passport.authenticate('jwt', { session: false }, (err, user) => {
      if (err) {
        return next(err);
      }
      
      if (!user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      
      req.user = user;
      next();
    })(req, res, next);
  };

  requireRole = (role: UserRole) => {
    return (req: Request, res: Response, next: NextFunction): void => {
      if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      
      if (req.user.role !== role && req.user.role !== UserRole.ADMIN) {
        return res.status(403).json({ error: 'Forbidden' });
      }
      
      next();
    };
  };

  authenticateClient = (req: Request, res: Response, next: NextFunction): void => {
    passport.authenticate('oauth2-client-password', { session: false }, (err, client) => {
      if (err) {
        return next(err);
      }
      
      if (!client) {
        return res.status(401).json({ error: 'Invalid client credentials' });
      }
      
      req.client = client;
      next();
    })(req, res, next);
  };
}