import { IVerificationTokenRepository } from '../../../../app/interfaces/repositories/IVerificationTokenRepository';
import { VerificationToken } from '../../../../domain/entities/VerificationToken';
import { TokenValue } from '../../../../domain/value-objects/TokenValue';
import { VerificationTokenModel, IVerificationTokenDocument } from '../models/VerificationTokenModel';
import { logger } from '../../../../shared/utils/logger';
import { BaseError } from '../../../../shared/errors/BaseError';
import { HTTP_STATUS } from '../../../../shared/constants/httpStatus';
import { ValidationUtils } from '../../../../shared/utils/validation';

class VerificationTokenRepositoryError extends BaseError {
  constructor(message: string, operation: string, originalError?: Error) {
    super(message, HTTP_STATUS.INTERNAL_SERVER_ERROR, false, {
      operation,
      originalError: originalError?.message
    });
  }
}

export class MongoVerificationTokenRepository implements IVerificationTokenRepository {
  private readonly logger = logger.setContext({ repository: 'MongoVerificationTokenRepository' });

  async findByToken(token: string): Promise<VerificationToken | null> {
    try {
      this.logger.debug('Finding verification token by token');
      const tokenDoc = await VerificationTokenModel.findOne({ token, verified: false });
      
      if (tokenDoc) {
        this.logger.debug('Verification token found', { tokenId: tokenDoc._id });
        return this.mapToEntity(tokenDoc);
      }
      
      this.logger.debug('Verification token not found');
      return null;
    } catch (error) {
      this.logger.error('Error finding verification token by token', { error });
      throw new VerificationTokenRepositoryError(
        `Failed to find verification token by token`,
        'findByToken',
        error instanceof Error ? error : undefined
      );
    }
  }

  async findByUserId(userId: string): Promise<VerificationToken | null> {
    try {
      this.logger.debug('Finding verification token by user ID', { userId });
      const tokenDoc = await VerificationTokenModel.findOne({ userId, verified: false });
      
      if (tokenDoc) {
        this.logger.debug('Verification token found by user ID', { 
          userId, 
          tokenId: tokenDoc._id 
        });
        return this.mapToEntity(tokenDoc);
      }
      
      this.logger.debug('Verification token not found by user ID', { userId });
      return null;
    } catch (error) {
      this.logger.error('Error finding verification token by user ID', { userId, error });
      throw new VerificationTokenRepositoryError(
        `Failed to find verification token by user ID`,
        'findByUserId',
        error instanceof Error ? error : undefined
      );
    }
  }

  async save(verificationToken: VerificationToken): Promise<VerificationToken> {
    try {
      this.logger.info('Saving new verification token', { 
        tokenId: verificationToken.getId(),
        userId: verificationToken.getUserId(),
        email: verificationToken.getEmail()
      });

      const tokenDoc = new VerificationTokenModel({
        _id: verificationToken.getId(),
        userId: verificationToken.getUserId(),
        email: verificationToken.getEmail(),
        token: verificationToken.getTokenString(),
        expiresAt: verificationToken.getToken().getExpiresAt(),
        verified: verificationToken.isVerified(),
        createdAt: verificationToken.getCreatedAt()
      });

      const savedDoc = await tokenDoc.save();
      
      this.logger.info('Verification token saved successfully', { tokenId: savedDoc._id });
      return this.mapToEntity(savedDoc);
    } catch (error) {
      this.logger.error('Error saving verification token', { 
        tokenId: verificationToken.getId(),
        userId: verificationToken.getUserId(),
        error 
      });

      throw new VerificationTokenRepositoryError(
        `Failed to save verification token`,
        'save',
        error instanceof Error ? error : undefined
      );
    }
  }

  async update(verificationToken: VerificationToken): Promise<VerificationToken> {
    try {
      this.logger.info('Updating verification token', { 
        tokenId: verificationToken.getId() 
      });

      const updatedDoc = await VerificationTokenModel.findByIdAndUpdate(
        verificationToken.getId(),
        {
          verified: verificationToken.isVerified()
        },
        { new: true }
      );

      if (!updatedDoc) {
        this.logger.warn('Verification token not found for update', { 
          tokenId: verificationToken.getId() 
        });
        throw new VerificationTokenRepositoryError(
          `VerificationToken with id ${verificationToken.getId()} not found for update`,
          'update'
        );
      }

      this.logger.info('Verification token updated successfully', { 
        tokenId: updatedDoc._id 
      });
      return this.mapToEntity(updatedDoc);
    } catch (error) {
      this.logger.error('Error updating verification token', { 
        tokenId: verificationToken.getId(), 
        error 
      });
      throw new VerificationTokenRepositoryError(
        `Failed to update verification token`,
        'update',
        error instanceof Error ? error : undefined
      );
    }
  }

  async delete(id: string): Promise<void> {
    try {
      if (!ValidationUtils.isValidObjectId(id)) {
        throw new VerificationTokenRepositoryError('Invalid token ID format', 'delete');
      }

      this.logger.info('Deleting verification token', { tokenId: id });
      
      const result = await VerificationTokenModel.findByIdAndDelete(id);
      
      if (!result) {
        this.logger.warn('Verification token not found for deletion', { tokenId: id });
        throw new VerificationTokenRepositoryError(
          `VerificationToken with id ${id} not found for deletion`, 
          'delete'
        );
      }

      this.logger.info('Verification token deleted successfully', { tokenId: id });
    } catch (error) {
      this.logger.error('Error deleting verification token', { tokenId: id, error });
      if (error instanceof VerificationTokenRepositoryError) {
        throw error;
      }
      throw new VerificationTokenRepositoryError(
        `Failed to delete verification token`,
        'delete',
        error instanceof Error ? error : undefined
      );
    }
  }

  async deleteByUserId(userId: string): Promise<void> {
    try {
      this.logger.info('Deleting verification tokens by user', { userId });
      
      const result = await VerificationTokenModel.deleteMany({ userId });
      
      this.logger.info('User verification tokens deleted', { 
        userId,
        count: result.deletedCount 
      });
    } catch (error) {
      this.logger.error('Error deleting user verification tokens', { userId, error });
      throw new VerificationTokenRepositoryError(
        `Failed to delete user verification tokens`,
        'deleteByUserId',
        error instanceof Error ? error : undefined
      );
    }
  }

  async deleteExpired(): Promise<void> {
    try {
      this.logger.info('Deleting expired verification tokens');
      
      const result = await VerificationTokenModel.deleteMany({
        expiresAt: { $lt: new Date() }
      });

      this.logger.info('Expired verification tokens deleted', { 
        count: result.deletedCount 
      });
    } catch (error) {
      this.logger.error('Error deleting expired verification tokens', { error });
      throw new VerificationTokenRepositoryError(
        `Failed to delete expired verification tokens`,
        'deleteExpired',
        error instanceof Error ? error : undefined
      );
    }
  }

  private mapToEntity(doc: IVerificationTokenDocument): VerificationToken {
    try {
      const tokenValue = new TokenValue(doc.token, doc.expiresAt);
      const verificationToken = new VerificationToken(
        doc._id.toString(),
        doc.userId,
        doc.email,
        tokenValue
      );

      // Set additional properties
      if (doc.verified) {
        (verificationToken as any).verified = true;
      }
      (verificationToken as any).createdAt = doc.createdAt;

      return verificationToken;
    } catch (error) {
      this.logger.error('Error mapping verification token document to entity', { 
        docId: doc._id, 
        error 
      });
      throw new VerificationTokenRepositoryError(
        'Failed to map verification token document to entity',
        'mapToEntity',
        error instanceof Error ? error : undefined
      );
    }
  }
}