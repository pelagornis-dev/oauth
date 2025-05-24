import { BaseUseCase } from '../common/BaseUseCase';
import { RefreshTokenRequestDto } from '../../dto/auth/RefreshTokenRequestDto';
import { RefreshTokenResponseDto } from '../../dto/auth/RefreshTokenResponseDto';
import { IUserRepository } from '../../interfaces/repositories/IUserRepository';
import { ITokenService } from '../../interfaces/services/ITokenService';
import { InvalidTokenException } from '../../../domain/exceptions/InvalidTokenException';
import { UserNotFoundException } from '../../../domain/exceptions/UserNotFoundException';
import { ValidationUtils } from '../../../shared/utils/validation';

export class RefreshTokenUseCase extends BaseUseCase<RefreshTokenRequestDto, RefreshTokenResponseDto> {
  constructor(
    private userRepository: IUserRepository,
    private tokenService: ITokenService
  ) {
    super();
  }

  async execute(request: RefreshTokenRequestDto): Promise<RefreshTokenResponseDto> {
    this.logExecutionStart(request);

    try {
      // Validate input
      if (!request.refreshToken?.trim()) {
        throw new Error('Refresh token is required');
      }

      if (!ValidationUtils.isValidJWTFormat(request.refreshToken)) {
        throw new Error('Invalid token format');
      }

      const payload = await this.tokenService.verifyToken(request.refreshToken);
      
      if (payload.type !== 'refresh') {
        this.logger.warn('Invalid token type for refresh', { 
          tokenType: payload.type,
          userId: payload.sub 
        });
        throw new InvalidTokenException('refresh');
      }

      const user = await this.userRepository.findById(payload.sub);
      if (!user) {
        this.logger.warn('Refresh token used for non-existent user', { userId: payload.sub });
        throw new UserNotFoundException(payload.sub);
      }

      if (!user.canLogin()) {
        this.logger.warn('Refresh token used for inactive user', { 
          userId: user.getId(),
          status: user.getStatus()
        });
        throw new Error('User account is not active');
      }

      // Generate new tokens
      const tokenPayload = {
        sub: user.getId(),
        email: user.getEmail().getValue(),
        type: 'access'
      };

      const accessToken = await this.tokenService.generateAccessToken(tokenPayload);
      const refreshToken = await this.tokenService.generateRefreshToken({
        ...tokenPayload,
        type: 'refresh'
      });

      const response: RefreshTokenResponseDto = {
        accessToken,
        refreshToken,
        expiresIn: 3600,
        tokenType: 'Bearer'
      };

      this.logger.info('Token refresh successful', { userId: user.getId() });

      this.logExecutionEnd(response);
      return response;

    } catch (error) {
      this.logExecutionError(error as Error, request);
      throw new InvalidTokenException('refresh');
    }
  }
}