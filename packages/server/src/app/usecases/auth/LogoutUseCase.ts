import { BaseUseCase } from '../common/BaseUseCase';
import { ITokenRepository } from '../../interfaces/repositories/ITokenRepository';
import { TokenType } from '../../../domain/enums/TokenType';
import { ValidationUtils } from '../../../shared/utils/validation';

export interface LogoutRequest {
  userId: string;
  token?: string;
}

export interface LogoutResponse {
  message: string;
  success: boolean;
}

export class LogoutUseCase extends BaseUseCase<LogoutRequest, LogoutResponse> {
  constructor(private tokenRepository: ITokenRepository) {
    super();
  }

  async execute(request: LogoutRequest): Promise<LogoutResponse> {
    this.logExecutionStart(request);

    try {
      // Validate input
      if (!request.userId?.trim()) {
        throw new Error('User ID is required');
      }

      if (!ValidationUtils.isValidObjectId(request.userId)) {
        throw new Error('Invalid user ID format');
      }

      // Invalidate all refresh tokens for the user
      await this.tokenRepository.deleteByUserId(request.userId, TokenType.REFRESH);

      this.logger.info('User logout successful', { userId: request.userId });

      const response: LogoutResponse = {
        message: 'Successfully logged out',
        success: true
      };

      this.logExecutionEnd(response);
      return response;

    } catch (error) {
      this.logExecutionError(error as Error, request);
      throw error;
    }
  }
}