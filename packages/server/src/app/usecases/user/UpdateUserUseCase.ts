import { BaseUseCase } from '../common/BaseUseCase';
import { UpdateUserRequestDto } from '../../dto/user/UpdateUserRequestDto';
import { UserResponseDto } from '../../dto/user/UserResponseDto';
import { IUserRepository } from '../../interfaces/repositories/IUserRepository';
import { IPasswordService } from '../../interfaces/services/IPasswordService';
import { Password } from '../../../domain/value-objects/Password';
import { UserNotFoundException } from '../../../domain/exceptions/UserNotFoundException';
import { InvalidCredentialsException } from '../../../domain/exceptions/InvalidCredentialsException';
import { ValidationUtils } from '../../../shared/utils/validation';

export interface UpdateUserRequest extends UpdateUserRequestDto {
  userId: string;
}

export class UpdateUserUseCase extends BaseUseCase<UpdateUserRequest, UserResponseDto> {
  constructor(
    private userRepository: IUserRepository,
    private passwordService: IPasswordService
  ) {
    super();
  }

  async execute(request: UpdateUserRequest): Promise<UserResponseDto> {
    this.logExecutionStart(request);

    try {
      // Validate input
      this.validateRequest(request);

      const user = await this.userRepository.findById(request.userId);
      
      if (!user) {
        this.logger.warn('Update attempted for non-existent user', { userId: request.userId });
        throw new UserNotFoundException(request.userId);
      }

      // Update profile information
      if (request.firstName || request.lastName) {
        const firstName = request.firstName ? 
          ValidationUtils.sanitizeString(request.firstName) : user.getFirstName();
        const lastName = request.lastName ? 
          ValidationUtils.sanitizeString(request.lastName) : user.getLastName();

        user.updateProfile(firstName, lastName);

        this.logger.info('User profile updated', { 
          userId: user.getId(),
          firstNameChanged: !!request.firstName,
          lastNameChanged: !!request.lastName
        });
      }

      // Update password if provided
      if (request.newPassword && request.currentPassword) {
        if (!user.getPassword()) {
          this.logger.warn('Password update attempted for OAuth user', { 
            userId: user.getId(),
            provider: user.getProvider()
          });
          throw new Error('Cannot update password for OAuth user');
        }

        const currentPassword = new Password(request.currentPassword);
        const isValidPassword = await this.passwordService.compare(
          currentPassword,
          user.getPassword()!.getValue()
        );

        if (!isValidPassword) {
          this.logger.warn('Invalid current password provided', { userId: user.getId() });
          throw new InvalidCredentialsException();
        }

        const newPassword = new Password(request.newPassword);
        const hashedPassword = await this.passwordService.hash(newPassword);
        user.updatePassword(new Password(hashedPassword, true));

        this.logger.info('User password updated', { userId: user.getId() });
      }

      const updatedUser = await this.userRepository.update(user);

      const response: UserResponseDto = {
        id: updatedUser.getId(),
        email: updatedUser.getEmail().getValue(),
        firstName: updatedUser.getFirstName(),
        lastName: updatedUser.getLastName(),
        fullName: updatedUser.getFullName(),
        status: updatedUser.getStatus(),
        provider: updatedUser.getProvider(),
        emailVerified: updatedUser.isEmailVerified(),
        lastLoginAt: updatedUser.getLastLoginAt()?.toISOString(),
        createdAt: updatedUser.getCreatedAt().toISOString(),
        updatedAt: updatedUser.getUpdatedAt().toISOString()
      };

      this.logExecutionEnd(response);
      return response;

    } catch (error) {
      this.logExecutionError(error as Error, request);
      throw error;
    }
  }

  private validateRequest(request: UpdateUserRequest): void {
    if (!request.userId?.trim()) {
      throw new Error('User ID is required');
    }

    if (!ValidationUtils.isValidObjectId(request.userId)) {
      throw new Error('Invalid user ID format');
    }

    // If updating password, both current and new password must be provided
    if ((request.currentPassword && !request.newPassword) || 
        (!request.currentPassword && request.newPassword)) {
      throw new Error('Both current and new password must be provided');
    }

    // Validate new password strength if provided
    if (request.newPassword) {
      const passwordValidation = ValidationUtils.isValidPassword(request.newPassword);
      if (!passwordValidation.valid) {
        throw new Error(`New password validation failed: ${passwordValidation.errors.join(', ')}`);
      }
    }

    // Validate name fields if provided
    if (request.firstName && !request.firstName.trim()) {
      throw new Error('First name cannot be empty');
    }

    if (request.lastName && !request.lastName.trim()) {
      throw new Error('Last name cannot be empty');
    }
  }
}