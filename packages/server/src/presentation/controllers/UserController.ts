import { Request, Response, NextFunction } from 'express';
import { GetUserUseCase } from '../../app/usecases/user/GetUserUseCase';
import { UpdateUserUseCase } from '../../app/usecases/user/UpdateUserUseCase';
import { ILocalizationService } from '../../app/interfaces/services/ILocalizationService';
import { UserSerializer } from '../serializers/UserSerializer';
import { ErrorSerializer } from '../serializers/ErrorSerializer';
import { logger } from '../../shared/utils/logger';
import { HTTP_STATUS } from '../../shared/constants/httpStatus';
import { ApiResponse } from '../../shared/types/response';
import { AuthenticatedRequest } from '../../shared/types/express';

export class UserController {
  private readonly logger = logger.setContext({ controller: 'UserController' });

  constructor(
    private getUserUseCase: GetUserUseCase,
    private updateUserUseCase: UpdateUserUseCase,
    private localizationService: ILocalizationService,
    private userSerializer: UserSerializer,
    private errorSerializer: ErrorSerializer
  ) {}

  public async getProfile(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user.id;
      const locale = req.locale;

      this.logger.info('Get user profile', { userId });

      const result = await this.getUserUseCase.execute({ userId });

      const response: ApiResponse = {
        success: true,
        data: {
          user: this.userSerializer.serialize(result.user)
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.requestId
        }
      };

      this.logger.debug('User profile retrieved', { userId });

      res.status(HTTP_STATUS.OK).json(response);
    } catch (error) {
      this.logger.error('Failed to get user profile', { userId: req.user?.id, error });
      next(error);
    }
  }

  public async updateProfile(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user.id;
      const { firstName, lastName, email } = req.body;
      const locale = req.locale;

      this.logger.info('Update user profile', { userId, firstName, lastName });

      const result = await this.updateUserUseCase.execute({
        userId,
        firstName,
        lastName,
        email
      });

      const response: ApiResponse = {
        success: true,
        message: 'Profile updated successfully',
        data: {
          user: this.userSerializer.serialize(result.user)
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.requestId
        }
      };

      this.logger.info('User profile updated', { userId });

      res.status(HTTP_STATUS.OK).json(response);
    } catch (error) {
      this.logger.error('Failed to update user profile', { userId: req.user?.id, error });
      next(error);
    }
  }

  public async deleteAccount(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user.id;
      const locale = req.locale;

      this.logger.info('Delete user account', { userId });

      // This would require a DeleteUserUseCase
      // For now, just return a placeholder response
      const response: ApiResponse = {
        success: true,
        message: 'Account deletion initiated',
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.requestId
        }
      };

      this.logger.info('User account deletion initiated', { userId });

      res.status(HTTP_STATUS.OK).json(response);
    } catch (error) {
      this.logger.error('Failed to delete user account', { userId: req.user?.id, error });
      next(error);
    }
  }

  public async changePassword(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user.id;
      const { currentPassword, newPassword } = req.body;
      const locale = req.locale;

      this.logger.info('Change password attempt', { userId });

      // This would require a ChangePasswordUseCase
      // For now, just return a placeholder response
      const response: ApiResponse = {
        success: true,
        message: 'Password changed successfully',
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.requestId
        }
      };

      this.logger.info('Password changed successfully', { userId });

      res.status(HTTP_STATUS.OK).json(response);
    } catch (error) {
      this.logger.error('Failed to change password', { userId: req.user?.id, error });
      next(error);
    }
  }
}