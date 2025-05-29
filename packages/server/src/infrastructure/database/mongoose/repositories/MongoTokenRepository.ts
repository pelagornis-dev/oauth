import { ITokenRepository } from '../../../../app/interfaces/repositories/ITokenRepository';
import { Token } from '../../../../domain/entities/Token';
import { TokenValue } from '../../../../domain/value-objects/TokenValue';
import { TokenType } from '../../../../domain/enums/TokenType';
import { TokenModel, ITokenDocument } from '../models/TokenModel';
import { logger } from '../../../../shared/utils/logger';
import { BaseError } from '../../../../shared/errors/BaseError';
import { HTTP_STATUS } from '../../../../shared/constants/httpStatus';
import { ValidationUtils } from '../../../../shared/utils/validation';

class TokenRepositoryError extends BaseError {
  constructor(message: string, operation: string, originalError?: Error) {
    super(message, HTTP_STATUS.INTERNAL_SERVER_ERROR, false, {
      operation,
      originalError: originalError?.message
    });
  }
}

export class MongoTokenRepository implements ITokenRepository {
  private readonly logger = logger.setContext({ repository: 'MongoTokenRepository' });

  async findById(id: string): Promise<Token | null> {
    try {
      if (!ValidationUtils.isValidObjectId(id)) {
        this.logger.warn('Invalid ObjectId provided', { id });
        return null;
      }

      this.logger.debug('Finding token by ID', { tokenId: id });
      const tokenDoc = await TokenModel.findById(id);
      
      if (tokenDoc) {
        this.logger.debug('Token found by ID', { tokenId: id });
        return this.mapToEntity(tokenDoc);
      }
      
      this.logger.debug('Token not found by ID', { tokenId: id });
      return null;
    } catch (error) {
      this.logger.error('Error finding token by ID', { tokenId: id, error });
      throw new TokenRepositoryError(
        `Failed to find token by ID: ${id}`,
        'findById',
        error instanceof Error ? error : undefined
      );
    }
  }

  async findByValue(value: string): Promise<Token | null> {
    try {
      this.logger.debug('Finding token by value');
      const tokenDoc = await TokenModel.findOne({ value, used: false });
      
      if (tokenDoc) {
        this.logger.debug('Token found by value', { tokenId: tokenDoc._id });
        return this.mapToEntity(tokenDoc);
      }
      
      this.logger.debug('Token not found by value');
      return null;
    } catch (error) {
      this.logger.error('Error finding token by value', { error });
      throw new TokenRepositoryError(
        `Failed to find token by value`,
        'findByValue',
        error instanceof Error ? error : undefined
      );
    }
  }

  async findByUserIdAndType(userId: string, type: TokenType): Promise<Token[]> {
    try {
      this.logger.debug('Finding tokens by user and type', { userId, type });
      const tokenDocs = await TokenModel.find({ userId, type, used: false });
      
      const tokens = tokenDocs.map(doc => this.mapToEntity(doc));
      
      this.logger.debug('Tokens found by user and type', { 
        userId, 
        type, 
        count: tokens.length 
      });
      
      return tokens;
    } catch (error) {
      this.logger.error('Error finding tokens by user and type', { userId, type, error });
      throw new TokenRepositoryError(
        `Failed to find tokens by user and type`,
        'findByUserIdAndType',
        error instanceof Error ? error : undefined
      );
    }
  }

  async save(token: Token): Promise<Token> {
    try {
      this.logger.info('Saving new token', { 
        tokenId: token.getId(),
        userId: token.getUserId(),
        type: token.getType()
      });

      const tokenDoc = new TokenModel({
        _id: token.getId(),
        userId: token.getUserId(),
        type: token.getType(),
        value: token.getTokenString(),
        expiresAt: token.getExpiresAt(),
        used: token.isUsed(),
        createdAt: token.getCreatedAt()
      });

      const savedDoc = await tokenDoc.save();
      
      this.logger.info('Token saved successfully', { tokenId: savedDoc._id });
      return this.mapToEntity(savedDoc);
    } catch (error) {
      this.logger.error('Error saving token', { 
        tokenId: token.getId(),
        userId: token.getUserId(),
        error 
      });

      throw new TokenRepositoryError(
        `Failed to save token`,
        'save',
        error instanceof Error ? error : undefined
      );
    }
  }

  async update(token: Token): Promise<Token> {
    try {
      this.logger.info('Updating token', { tokenId: token.getId() });

      const updatedDoc = await TokenModel.findByIdAndUpdate(
        token.getId(),
        {
          used: token.isUsed()
        },
        { new: true }
      );

      if (!updatedDoc) {
        this.logger.warn('Token not found for update', { tokenId: token.getId() });
        throw new TokenRepositoryError(
          `Token with id ${token.getId()} not found for update`,
          'update'
        );
      }

      this.logger.info('Token updated successfully', { tokenId: updatedDoc._id });
      return this.mapToEntity(updatedDoc);
    } catch (error) {
      this.logger.error('Error updating token', { tokenId: token.getId(), error });
      throw new TokenRepositoryError(
        `Failed to update token`,
        'update',
        error instanceof Error ? error : undefined
      );
    }
  }

  async delete(id: string): Promise<void> {
    try {
      if (!ValidationUtils.isValidObjectId(id)) {
        throw new TokenRepositoryError('Invalid token ID format', 'delete');
      }

      this.logger.info('Deleting token', { tokenId: id });
      
      const result = await TokenModel.findByIdAndDelete(id);
      
      if (!result) {
        this.logger.warn('Token not found for deletion', { tokenId: id });
        throw new TokenRepositoryError(`Token with id ${id} not found for deletion`, 'delete');
      }

      this.logger.info('Token deleted successfully', { tokenId: id });
    } catch (error) {
      this.logger.error('Error deleting token', { tokenId: id, error });
      if (error instanceof TokenRepositoryError) {
        throw error;
      }
      throw new TokenRepositoryError(
        `Failed to delete token`,
        'delete',
        error instanceof Error ? error : undefined
      );
    }
  }

  async deleteExpired(): Promise<void> {
    try {
      this.logger.info('Deleting expired tokens');
      
      const result = await TokenModel.deleteMany({
        expiresAt: { $lt: new Date() }
      });

      this.logger.info('Expired tokens deleted', { count: result.deletedCount });
    } catch (error) {
      this.logger.error('Error deleting expired tokens', { error });
      throw new TokenRepositoryError(
        `Failed to delete expired tokens`,
        'deleteExpired',
        error instanceof Error ? error : undefined
      );
    }
  }

  async deleteByUserId(userId: string, type?: TokenType): Promise<void> {
    try {
      this.logger.info('Deleting tokens by user', { userId, type });
      
      const query: any = { userId };
      if (type) {
        query.type = type;
      }
      
      const result = await TokenModel.deleteMany(query);
      
      this.logger.info('User tokens deleted', { 
        userId, 
        type,
        count: result.deletedCount 
      });
    } catch (error) {
      this.logger.error('Error deleting user tokens', { userId, type, error });
      throw new TokenRepositoryError(
        `Failed to delete user tokens`,
        'deleteByUserId',
        error instanceof Error ? error : undefined
      );
    }
  }

  private mapToEntity(doc: ITokenDocument): Token {
    try {
      const tokenValue = new TokenValue(doc.value, doc.expiresAt);
      const token = new Token(
        doc._id.toString(),
        doc.userId,
        doc.type as TokenType,
        tokenValue
      );

      // Set additional properties
      if (doc.used) {
        (token as any).used = true;
      }
      (token as any).createdAt = doc.createdAt;

      return token;
    } catch (error) {
      this.logger.error('Error mapping token document to entity', { docId: doc._id, error });
      throw new TokenRepositoryError(
        'Failed to map token document to entity',
        'mapToEntity',
        error instanceof Error ? error : undefined
      );
    }
  }
}