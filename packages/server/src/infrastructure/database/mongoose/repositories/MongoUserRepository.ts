import { IUserRepository } from '../../../../app/interfaces/repositories/IUserRepository';
import { User } from '../../../../domain/entities/User';
import { Email } from '../../../../domain/value-objects/Email';
import { Password } from '../../../../domain/value-objects/Password';
import { UserModel, IUserDocument } from '../models/UserModel';
import { AuthProvider } from '../../../../domain/enums/AuthProvider';
import { logger } from '../../../../shared/utils/logger';
import { BaseError } from '../../../../shared/errors/BaseError';
import { HTTP_STATUS } from '../../../../shared/constants/httpStatus';
import { ValidationUtils } from '../../../../shared/utils/validation';

class RepositoryError extends BaseError {
  constructor(message: string, operation: string, originalError?: Error) {
    super(message, HTTP_STATUS.INTERNAL_SERVER_ERROR, false, {
      operation,
      originalError: originalError?.message
    });
  }
}

export class MongoUserRepository implements IUserRepository {
  private readonly logger = logger.setContext({ repository: 'MongoUserRepository' });

  async findById(id: string): Promise<User | null> {
    try {
      if (!ValidationUtils.isValidObjectId(id)) {
        this.logger.warn('Invalid ObjectId provided', { id });
        return null;
      }

      this.logger.debug('Finding user by ID', { userId: id });
      const userDoc = await UserModel.findById(id);
      
      if (userDoc) {
        this.logger.debug('User found by ID', { userId: id });
        return this.mapToEntity(userDoc);
      }
      
      this.logger.debug('User not found by ID', { userId: id });
      return null;
    } catch (error) {
      this.logger.error('Error finding user by ID', { userId: id, error });
      throw new RepositoryError(
        `Failed to find user by ID: ${id}`,
        'findById',
        error instanceof Error ? error : undefined
      );
    }
  }

  async findByEmail(email: Email): Promise<User | null> {
    try {
      const emailValue = email.getValue();
      this.logger.debug('Finding user by email', { email: emailValue });
      
      const userDoc = await UserModel.findOne({ email: emailValue });
      
      if (userDoc) {
        this.logger.debug('User found by email', { email: emailValue, userId: userDoc._id });
        return this.mapToEntity(userDoc);
      }
      
      this.logger.debug('User not found by email', { email: emailValue });
      return null;
    } catch (error) {
      this.logger.error('Error finding user by email', { email: email.getValue(), error });
      throw new RepositoryError(
        `Failed to find user by email`,
        'findByEmail',
        error instanceof Error ? error : undefined
      );
    }
  }

  async findByProviderInfo(provider: string, providerId: string): Promise<User | null> {
    try {
      this.logger.debug('Finding user by provider info', { provider, providerId });
      
      const userDoc = await UserModel.findOne({ provider, providerId });
      
      if (userDoc) {
        this.logger.debug('User found by provider info', { 
          provider, 
          providerId, 
          userId: userDoc._id 
        });
        return this.mapToEntity(userDoc);
      }
      
      this.logger.debug('User not found by provider info', { provider, providerId });
      return null;
    } catch (error) {
      this.logger.error('Error finding user by provider info', { provider, providerId, error });
      throw new RepositoryError(
        `Failed to find user by provider info`,
        'findByProviderInfo',
        error instanceof Error ? error : undefined
      );
    }
  }

  async save(user: User): Promise<User> {
    try {
      this.logger.info('Saving new user', { 
        userId: user.getId(),
        email: user.getEmail().getValue(),
        provider: user.getProvider()
      });

      const userDoc = new UserModel({
        _id: user.getId(),
        email: user.getEmail().getValue(),
        password: user.getPassword()?.getValue(),
        firstName: user.getFirstName(),
        lastName: user.getLastName(),
        status: user.getStatus(),
        provider: user.getProvider(),
        providerId: user.getProviderId(),
        emailVerified: user.isEmailVerified(),
        lastLoginAt: user.getLastLoginAt(),
        createdAt: user.getCreatedAt(),
        updatedAt: user.getUpdatedAt()
      });

      const savedDoc = await userDoc.save();
      
      this.logger.info('User saved successfully', { userId: savedDoc._id });
      return this.mapToEntity(savedDoc);
    } catch (error) {
      this.logger.error('Error saving user', { 
        userId: user.getId(),
        email: user.getEmail().getValue(),
        error 
      });

      // Handle duplicate email error
      if (error instanceof Error && error.message.includes('E11000')) {
        throw new RepositoryError(
          `User with email ${user.getEmail().getValue()} already exists`,
          'save',
          error
        );
      }

      throw new RepositoryError(
        `Failed to save user`,
        'save',
        error instanceof Error ? error : undefined
      );
    }
  }

  async update(user: User): Promise<User> {
    try {
      this.logger.info('Updating user', { userId: user.getId() });

      const updatedDoc = await UserModel.findByIdAndUpdate(
        user.getId(),
        {
          email: user.getEmail().getValue(),
          password: user.getPassword()?.getValue(),
          firstName: user.getFirstName(),
          lastName: user.getLastName(),
          status: user.getStatus(),
          provider: user.getProvider(),
          providerId: user.getProviderId(),
          emailVerified: user.isEmailVerified(),
          lastLoginAt: user.getLastLoginAt(),
          updatedAt: user.getUpdatedAt()
        },
        { new: true }
      );

      if (!updatedDoc) {
        this.logger.warn('User not found for update', { userId: user.getId() });
        throw new RepositoryError(
          `User with id ${user.getId()} not found for update`,
          'update'
        );
      }

      this.logger.info('User updated successfully', { userId: updatedDoc._id });
      return this.mapToEntity(updatedDoc);
    } catch (error) {
      this.logger.error('Error updating user', { userId: user.getId(), error });
      throw new RepositoryError(
        `Failed to update user`,
        'update',
        error instanceof Error ? error : undefined
      );
    }
  }

  async delete(id: string): Promise<void> {
    try {
      if (!ValidationUtils.isValidObjectId(id)) {
        throw new RepositoryError('Invalid user ID format', 'delete');
      }

      this.logger.info('Deleting user', { userId: id });
      
      const result = await UserModel.findByIdAndDelete(id);
      
      if (!result) {
        this.logger.warn('User not found for deletion', { userId: id });
        throw new RepositoryError(`User with id ${id} not found for deletion`, 'delete');
      }

      this.logger.info('User deleted successfully', { userId: id });
    } catch (error) {
      this.logger.error('Error deleting user', { userId: id, error });
      if (error instanceof RepositoryError) {
        throw error;
      }
      throw new RepositoryError(
        `Failed to delete user`,
        'delete',
        error instanceof Error ? error : undefined
      );
    }
  }

  async exists(email: Email): Promise<boolean> {
    try {
      const emailValue = email.getValue();
      this.logger.debug('Checking if user exists', { email: emailValue });
      
      const count = await UserModel.countDocuments({ email: emailValue });
      const exists = count > 0;
      
      this.logger.debug('User existence check completed', { email: emailValue, exists });
      return exists;
    } catch (error) {
      this.logger.error('Error checking user existence', { email: email.getValue(), error });
      throw new RepositoryError(
        `Failed to check user existence`,
        'exists',
        error instanceof Error ? error : undefined
      );
    }
  }

  private mapToEntity(doc: IUserDocument): User {
    try {
      const email = new Email(doc.email);
      const password = doc.password ? new Password(doc.password, true) : undefined;

      const user = new User(
        doc._id.toString(),
        email,
        doc.firstName,
        doc.lastName,
        doc.provider as AuthProvider,
        password,
        doc.providerId
      );

      // Set additional properties using reflection (accessing private properties)
      (user as any).status = doc.status;
      (user as any).emailVerified = doc.emailVerified;
      (user as any).lastLoginAt = doc.lastLoginAt;
      (user as any).createdAt = doc.createdAt;
      (user as any).updatedAt = doc.updatedAt;

      return user;
    } catch (error) {
      this.logger.error('Error mapping document to entity', { docId: doc._id, error });
      throw new RepositoryError(
        'Failed to map user document to entity',
        'mapToEntity',
        error instanceof Error ? error : undefined
      );
    }
  }
}