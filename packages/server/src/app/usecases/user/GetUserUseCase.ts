import { BaseUseCase } from '../common/BaseUseCase';
import { UserResponseDto } from '../../dto/user/UserResponseDto';
import { IUserRepository } from '../../interfaces/repositories/IUserRepository';
import { UserNotFoundException } from '../../../domain/exceptions/UserNotFoundException';
import { ValidationUtils } from '../../../shared/utils/validation';

export interface GetUserRequest {
  userId: string;
}

export class GetUserUseCase extends BaseUseCase<GetUserRequest, UserResponseDto> {
  constructor(private userRepository: IUserRepository) {
    super();
  }

  async execute(request: GetUserRequest): Promise<UserResponseDto> {
    this.logExecutionStart(request);

    try {
      // Validate input
      if (!request.userId?.trim()) {
        throw new Error('User ID is required');
      }

      if (!ValidationUtils.isValidObjectId(request.userId)) {
        throw new Error('Invalid user ID format');
      }

      const user = await this.userRepository.findById(request.userId);
      
      if (!user) {
        this.logger.warn('User not found', { userId: request.userId });
        throw new UserNotFoundException(request.userId);
      }

      const response: UserResponseDto = {
        id: user.getId(),
        email: user.getEmail().getValue(),
        firstName: user.getFirstName(),
        lastName: user.getLastName(),
        fullName: user.getFullName(),
        status: user.getStatus(),
        provider: user.getProvider(),
        emailVerified: user.isEmailVerified(),
        lastLoginAt: user.getLastLoginAt()?.toISOString(),
        createdAt: user.getCreatedAt().toISOString(),
        updatedAt: user.getUpdatedAt().toISOString()
      };

      this.logger.debug('User retrieved successfully', { userId: user.getId() });

      this.logExecutionEnd(response);
      return response;

    } catch (error) {
      this.logExecutionError(error as Error, request);
      throw error;
    }
  }
}