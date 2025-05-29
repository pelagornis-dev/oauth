import { User } from '../../domain/entities/User';
import { logger } from '../../shared/utils/logger';

export interface SerializedUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  status: string;
  provider: string;
  emailVerified: boolean;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SerializedUserProfile extends SerializedUser {
  // Additional fields that might be shown in detailed profile view
  providerId?: string;
}

export interface SerializedUserSummary {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  emailVerified: boolean;
}

export class UserSerializer {
  private readonly logger = logger.setContext({ serializer: 'UserSerializer' });

  /**
   * Serialize user for general API responses
   */
  public serialize(user: User): SerializedUser {
    try {
      return {
        id: user.getId(),
        email: user.getEmail().getValue(),
        firstName: user.getFirstName(),
        lastName: user.getLastName(),
        fullName: `${user.getFirstName()} ${user.getLastName()}`,
        status: user.getStatus(),
        provider: user.getProvider(),
        emailVerified: user.isEmailVerified(),
        lastLoginAt: user.getLastLoginAt()?.toISOString(),
        createdAt: user.getCreatedAt().toISOString(),
        updatedAt: user.getUpdatedAt().toISOString()
      };
    } catch (error) {
      this.logger.error('Error serializing user', { 
        userId: user.getId(),
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Serialize user for profile view (includes more details)
   */
  public serializeProfile(user: User): SerializedUserProfile {
    try {
      const baseUser = this.serialize(user);
      
      return {
        ...baseUser,
        providerId: user.getProviderId()
      };
    } catch (error) {
      this.logger.error('Error serializing user profile', { 
        userId: user.getId(),
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Serialize user for summary/listing views (minimal data)
   */
  public serializeSummary(user: User): SerializedUserSummary {
    try {
      return {
        id: user.getId(),
        firstName: user.getFirstName(),
        lastName: user.getLastName(),
        fullName: `${user.getFirstName()} ${user.getLastName()}`,
        email: user.getEmail().getValue(),
        emailVerified: user.isEmailVerified()
      };
    } catch (error) {
      this.logger.error('Error serializing user summary', { 
        userId: user.getId(),
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Serialize multiple users
   */
  public serializeMany(users: User[]): SerializedUser[] {
    return users.map(user => this.serialize(user));
  }

  /**
   * Serialize multiple users as summaries
   */
  public serializeManySummary(users: User[]): SerializedUserSummary[] {
    return users.map(user => this.serializeSummary(user));
  }

  /**
   * Serialize user for public display (very minimal data)
   */
  public serializePublic(user: User): { id: string; firstName: string; lastName: string } {
    return {
      id: user.getId(),
      firstName: user.getFirstName(),
      lastName: user.getLastName()
    };
  }
}