import { Request, Response, NextFunction } from 'express';
import { ITokenService } from '../../app/interfaces/services/ITokenService';
import { IUserRepository } from '../../app/interfaces/repositories/IUserRepository';
import { logger } from '../../shared/utils/logger';
import { AuthenticationError } from '../../shared/errors/AuthenticationError';
import { HTTP_STATUS } from '../../shared/constants/httpStatus';

export class AuthenticationMiddleware {
  private readonly logger = logger.setContext({ middleware: 'AuthenticationMiddleware' });

  constructor(
    private tokenService: ITokenService,
    private userRepository: IUserRepository
  ) {}

  public authenticate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        this.logger.warn('Missing or invalid authorization header', { 
          path: req.path,
          method: req.method 
        });
        throw AuthenticationError.missingToken();
      }

      const token = authHeader.substring(7); // Remove 'Bearer ' prefix
      
      if (!token) {
        this.logger.warn('Empty token provided', { path: req.path });
        throw AuthenticationError.missingToken();
      }

      // Verify and decode token
      const payload = await this.tokenService.verifyToken(token);
      
      if (payload.type !== 'access') {
        this.logger.warn('Invalid token type for authentication', { 
          type: payload.type,
          userId: payload.sub 
        });
        throw AuthenticationError.invalidToken();
      }

      // Get user from database
      const user = await this.userRepository.findById(payload.sub);
      if (!user) {
        this.logger.warn('User not found for valid token', { userId: payload.sub });
        throw AuthenticationError.invalidToken();
      }

      // Check if user account is active
      if (user.getStatus() === 'SUSPENDED') {
        this.logger.warn('Suspended user attempted access', { userId: user.getId() });
        throw new AuthenticationError('Account has been suspended', 'ACCOUNT_SUSPENDED');
      }

      // Add user to request object
      req.user = {
        id: user.getId(),
        email: user.getEmail().getValue(),
        firstName: user.getFirstName(),
        lastName: user.getLastName(),
        provider: user.getProvider(),
        emailVerified: user.isEmailVerified()
      };

      this.logger.debug('Authentication successful', { 
        userId: user.getId(),
        path: req.path 
      });

      next();
    } catch (error) {
      this.logger.error('Authentication failed', { 
        path: req.path,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      next(error);
    }
  };

  public optional = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        // No authentication provided, continue without user
        return next();
      }

      const token = authHeader.substring(7);
      
      if (!token) {
        return next();
      }

      try {
        const payload = await this.tokenService.verifyToken(token);
        
        if (payload.type === 'access') {
          const user = await this.userRepository.findById(payload.sub);
          
          if (user && user.getStatus() !== 'SUSPENDED') {
            req.user = {
              id: user.getId(),
              email: user.getEmail().getValue(),
              firstName: user.getFirstName(),
              lastName: user.getLastName(),
              provider: user.getProvider(),
              emailVerified: user.isEmailVerified()
            };
          }
        }
      } catch (error) {
        // Invalid token, but continue without user for optional auth
        this.logger.debug('Optional authentication failed', { error });
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}