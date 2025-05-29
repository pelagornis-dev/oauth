import { Request, Response, NextFunction } from 'express';
import { LoginUseCase } from '../../app/usecases/auth/LoginUseCase';
import { RegisterUseCase } from '../../app/usecases/auth/RegisterUseCase';
import { GoogleAuthUseCase } from '../../app/usecases/auth/GoogleAuthUseCase';
import { LogoutUseCase } from '../../app/usecases/auth/LogoutUseCase';
import { RefreshTokenUseCase } from '../../app/usecases/auth/RefreshTokenUseCase';
import { VerifyEmailUseCase } from '../../app/usecases/user/VerifyEmailUseCase';
import { ResetPasswordUseCase } from '../../app/usecases/user/ResetPasswordUseCase';
import { ILocalizationService } from '../../app/interfaces/services/ILocalizationService';
import { UserSerializer } from '../serializers/UserSerializer';
import { TokenSerializer } from '../serializers/TokenSerializer';
import { ErrorSerializer } from '../serializers/ErrorSerializer';
import { logger } from '../../shared/utils/logger';
import { ValidationError } from '../../shared/errors/ValidationError';
import { AuthenticationError } from '../../shared/errors/AuthenticationError';
import { HTTP_STATUS } from '../../shared/constants/httpStatus';
import { ApiResponse } from '../../shared/types/response';

export class AuthController {
  private readonly logger = logger.setContext({ controller: 'AuthController' });

  constructor(
    private loginUseCase: LoginUseCase,
    private registerUseCase: RegisterUseCase,
    private googleAuthUseCase: GoogleAuthUseCase,
    private logoutUseCase: LogoutUseCase,
    private refreshTokenUseCase: RefreshTokenUseCase,
    private verifyEmailUseCase: VerifyEmailUseCase,
    private resetPasswordUseCase: ResetPasswordUseCase,
    private localizationService: ILocalizationService,
    private userSerializer: UserSerializer,
    private tokenSerializer: TokenSerializer,
    private errorSerializer: ErrorSerializer
  ) {}

  public async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, password } = req.body;
      const locale = req.locale;

      this.logger.info('Login attempt', { email, locale });

      const result = await this.loginUseCase.execute({
        email,
        password,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent') || ''
      });

      const response: ApiResponse = {
        success: true,
        message: this.localizationService.t('success.auth.login', locale),
        data: {
          user: this.userSerializer.serialize(result.user),
          tokens: this.tokenSerializer.serialize(result.tokens)
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.requestId
        }
      };

      this.logger.info('Login successful', { 
        userId: result.user.getId(),
        email: result.user.getEmail().getValue()
      });

      res.status(HTTP_STATUS.OK).json(response);
    } catch (error) {
      this.logger.error('Login failed', { email: req.body?.email, error });
      next(error);
    }
  }

  public async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, password, firstName, lastName } = req.body;
      const locale = req.locale;

      this.logger.info('Registration attempt', { email, firstName, lastName, locale });

      const result = await this.registerUseCase.execute({
        email,
        password,
        firstName,
        lastName,
        locale
      });

      const response: ApiResponse = {
        success: true,
        message: this.localizationService.t('success.auth.register', locale),
        data: {
          user: this.userSerializer.serialize(result.user),
          verificationRequired: true
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.requestId
        }
      };

      this.logger.info('Registration successful', { 
        userId: result.user.getId(),
        email: result.user.getEmail().getValue()
      });

      res.status(HTTP_STATUS.CREATED).json(response);
    } catch (error) {
      this.logger.error('Registration failed', { email: req.body?.email, error });
      next(error);
    }
  }

  public async googleAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // This is called after successful Google OAuth callback
      const user = req.user as any; // Set by Passport strategy
      const locale = req.locale;

      this.logger.info('Google OAuth callback', { userId: user.id });

      const result = await this.googleAuthUseCase.execute({
        googleUser: user,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent') || ''
      });

      const response: ApiResponse = {
        success: true,
        message: this.localizationService.t('success.auth.login', locale),
        data: {
          user: this.userSerializer.serialize(result.user),
          tokens: this.tokenSerializer.serialize(result.tokens),
          isNewUser: result.isNewUser
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.requestId
        }
      };

      // For OAuth, typically redirect to frontend with tokens
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:4321';
      const redirectUrl = `${frontendUrl}/auth/callback?token=${result.tokens.accessToken}&refresh=${result.tokens.refreshToken}`;

      res.redirect(redirectUrl);
    } catch (error) {
      this.logger.error('Google OAuth failed', { user: req.user, error });
      next(error);
    }
  }

  public async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user!;
      const locale = req.locale;

      this.logger.info('Logout attempt', { userId: user.id });

      await this.logoutUseCase.execute({
        userId: user.id
      });

      const response: ApiResponse = {
        success: true,
        message: this.localizationService.t('success.auth.logout', locale),
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.requestId
        }
      };

      this.logger.info('Logout successful', { userId: user.id });

      res.status(HTTP_STATUS.OK).json(response);
    } catch (error) {
      this.logger.error('Logout failed', { userId: req.user?.id, error });
      next(error);
    }
  }

  public async refreshToken(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { refreshToken } = req.body;
      const locale = req.locale;

      this.logger.info('Token refresh attempt');

      const result = await this.refreshTokenUseCase.execute({
        refreshToken
      });

      const response: ApiResponse = {
        success: true,
        message: 'Token refreshed successfully',
        data: {
          tokens: this.tokenSerializer.serialize(result.tokens)
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.requestId
        }
      };

      this.logger.info('Token refresh successful', { userId: result.user.getId() });

      res.status(HTTP_STATUS.OK).json(response);
    } catch (error) {
      this.logger.error('Token refresh failed', { error });
      next(error);
    }
  }

  public async verifyEmail(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { token } = req.query;
      const locale = req.locale;

      this.logger.info('Email verification attempt', { token });

      const result = await this.verifyEmailUseCase.execute({
        token: token as string
      });

      const response: ApiResponse = {
        success: true,
        message: this.localizationService.t('success.auth.email_verified', locale),
        data: {
          user: this.userSerializer.serialize(result.user)
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.requestId
        }
      };

      this.logger.info('Email verification successful', { userId: result.user.getId() });

      res.status(HTTP_STATUS.OK).json(response);
    } catch (error) {
      this.logger.error('Email verification failed', { token: req.query.token, error });
      next(error);
    }
  }

  public async forgotPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email } = req.body;
      const locale = req.locale;

      this.logger.info('Password reset request', { email });

      await this.resetPasswordUseCase.execute({
        email,
        locale
      });

      const response: ApiResponse = {
        success: true,
        message: this.localizationService.t('success.auth.password_reset', locale),
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.requestId
        }
      };

      this.logger.info('Password reset email sent', { email });

      res.status(HTTP_STATUS.OK).json(response);
    } catch (error) {
      this.logger.error('Password reset failed', { email: req.body?.email, error });
      next(error);
    }
  }

  public async resetPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { token, newPassword } = req.body;
      const locale = req.locale;

      this.logger.info('Password reset attempt');

      const result = await this.resetPasswordUseCase.execute({
        token,
        newPassword
      });

      const response: ApiResponse = {
        success: true,
        message: 'Password reset successfully',
        data: {
          user: this.userSerializer.serialize(result.user)
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.requestId
        }
      };

      this.logger.info('Password reset successful', { userId: result.user.getId() });

      res.status(HTTP_STATUS.OK).json(response);
    } catch (error) {
      this.logger.error('Password reset failed', { error });
      next(error);
    }
  }

  // OAuth initiation endpoints
  public async initiateGoogleAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
    // This will be handled by Passport middleware
    // Just for documentation purposes
  }
}