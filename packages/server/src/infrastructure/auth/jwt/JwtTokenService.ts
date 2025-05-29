import jwt from 'jsonwebtoken';
import { ITokenService, TokenPayload } from '../../../application/interfaces/services/ITokenService';
import { environment } from '../../config/environment';
import { logger } from '../../../shared/utils/logger';
import { CryptoUtils } from '../../../shared/utils/crypto';
import { ValidationUtils } from '../../../shared/utils/validation';
import { BaseError } from '../../../shared/errors/BaseError';
import { HTTP_STATUS } from '../../../shared/constants/httpStatus';
import { CONFIG } from '../../../shared/constants/config';

class TokenServiceError extends BaseError {
  constructor(message: string, operation: string, originalError?: Error) {
    super(message, HTTP_STATUS.INTERNAL_SERVER_ERROR, false, {
      operation,
      originalError: originalError?.message
    });
  }
}

export class JwtTokenService implements ITokenService {
  private readonly secret: string;
  private readonly accessExpiresIn: string | number;
  private readonly refreshExpiresIn: string | number;
  private readonly logger = logger.setContext({ service: 'JwtTokenService' });

  constructor() {
    this.secret = environment.JWT_SECRET;
    this.accessExpiresIn = environment.JWT_ACCESS_EXPIRES_IN;
    this.refreshExpiresIn = environment.JWT_REFRESH_EXPIRES_IN;

    if (!this.secret || this.secret.length === 0) {
      throw new TokenServiceError('JWT_SECRET is required and cannot be empty', 'constructor');
    }

    if (this.secret.length < 32) {
      this.logger.warn('JWT secret is shorter than recommended 32 characters', {
        currentLength: this.secret.length,
        recommended: 32
      });
    }

    this.logger.info('JWT Token service initialized', {
      algorithm: CONFIG.JWT_ALGORITHM,
      accessExpiry: this.accessExpiresIn,
      refreshExpiry: this.refreshExpiresIn
    });
  }

  async generateAccessToken(payload: TokenPayload): Promise<string> {
    try {
      this.logger.debug('Generating access token', { 
        userId: payload.sub,
        type: payload.type 
      });

      const tokenPayload = {
        ...payload,
        type: 'access',
        jti: CryptoUtils.generateUUID(), // JWT ID for token tracking
        iss: 'pelagornis-oauth',
        aud: 'pelagornis-app'
      };

      const token = jwt.sign(tokenPayload, this.secret, {
        expiresIn: this.accessExpiresIn,
        issuer: 'pelagornis-oauth',
        audience: 'pelagornis-app',
        algorithm: 'HS256'
      });

      this.logger.debug('Access token generated successfully', { 
        userId: payload.sub,
        jti: tokenPayload.jti
      });

      return token;
    } catch (error) {
      this.logger.error('Error generating access token', { 
        userId: payload.sub, 
        error 
      });
      throw new TokenServiceError(
        'Failed to generate access token',
        'generateAccessToken',
        error instanceof Error ? error : undefined
      );
    }
  }

  async generateRefreshToken(payload: TokenPayload): Promise<string> {
    try {
      this.logger.debug('Generating refresh token', { 
        userId: payload.sub,
        type: payload.type 
      });

      const tokenPayload = {
        ...payload,
        type: 'refresh',
        jti: CryptoUtils.generateUUID(),
        iss: 'pelagornis-oauth',
        aud: 'pelagornis-app'
      };

      const token = jwt.sign(tokenPayload, this.secret, {
        expiresIn: this.refreshExpiresIn,
        issuer: 'pelagornis-oauth',
        audience: 'pelagornis-app',
        algorithm: 'HS256'
      });

      this.logger.debug('Refresh token generated successfully', { 
        userId: payload.sub,
        jti: tokenPayload.jti
      });

      return token;
    } catch (error) {
      this.logger.error('Error generating refresh token', { 
        userId: payload.sub, 
        error 
      });
      throw new TokenServiceError(
        'Failed to generate refresh token',
        'generateRefreshToken',
        error instanceof Error ? error : undefined
      );
    }
  }

  async generateVerificationToken(): Promise<string> {
    try {
      this.logger.debug('Generating verification token');
      
      // Generate a cryptographically secure random token
      const token = CryptoUtils.generateToken(32);
      
      this.logger.debug('Verification token generated successfully');
      
      return token;
    } catch (error) {
      this.logger.error('Error generating verification token', { error });
      throw new TokenServiceError(
        'Failed to generate verification token',
        'generateVerificationToken',
        error instanceof Error ? error : undefined
      );
    }
  }

  async verifyToken(token: string): Promise<TokenPayload> {
    try {
      this.logger.debug('Verifying token');

      if (!ValidationUtils.isValidJWTFormat(token)) {
        throw new TokenServiceError('Invalid token format', 'verifyToken');
      }

      const decoded = jwt.verify(token, this.secret, {
        issuer: 'pelagornis-oauth',
        audience: 'pelagornis-app',
        algorithms: ['HS256']
      }) as TokenPayload;

      this.logger.debug('Token verified successfully', { 
        userId: decoded.sub,
        type: decoded.type,
        jti: (decoded as any).jti
      });

      return decoded;
    } catch (error) {
      this.logger.warn('Token verification failed', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        tokenPreview: token.substring(0, 20) + '...'
      });
      
      if (error instanceof jwt.JsonWebTokenError) {
        throw new TokenServiceError('Invalid or malformed token', 'verifyToken', error);
      }
      
      if (error instanceof jwt.TokenExpiredError) {
        throw new TokenServiceError('Token has expired', 'verifyToken', error);
      }
      
      if (error instanceof jwt.NotBeforeError) {
        throw new TokenServiceError('Token not active yet', 'verifyToken', error);
      }

      throw new TokenServiceError(
        'Token verification failed',
        'verifyToken',
        error instanceof Error ? error : undefined
      );
    }
  }

  decodeToken(token: string): TokenPayload | null {
    try {
      this.logger.debug('Decoding token without verification');
      
      if (!ValidationUtils.isValidJWTFormat(token)) {
        this.logger.warn('Invalid token format for decoding');
        return null;
      }

      const decoded = jwt.decode(token) as TokenPayload;
      
      this.logger.debug('Token decoded successfully', { 
        userId: decoded?.sub,
        type: decoded?.type
      });
      
      return decoded;
    } catch (error) {
      this.logger.warn('Error decoding token', { error });
      return null;
    }
  }

  getTokenExpiration(token: string): Date | null {
    try {
      const decoded = this.decodeToken(token);
      if (!decoded?.exp) {
        return null;
      }
      
      const expiration = new Date(decoded.exp * 1000);
      
      this.logger.debug('Token expiration retrieved', { 
        expiration: expiration.toISOString(),
        userId: decoded.sub
      });
      
      return expiration;
    } catch (error) {
      this.logger.warn('Error getting token expiration', { error });
      return null;
    }
  }

  // Additional utility methods
  isTokenExpired(token: string): boolean {
    const expiration = this.getTokenExpiration(token);
    if (!expiration) return true;
    
    const isExpired = expiration.getTime() < Date.now();
    
    this.logger.debug('Token expiration check', { 
      expired: isExpired,
      expiration: expiration.toISOString()
    });
    
    return isExpired;
  }

  getTokenInfo(token: string): { 
    valid: boolean; 
    expired: boolean; 
    payload: TokenPayload | null; 
    expiration: Date | null; 
  } {
    const payload = this.decodeToken(token);
    const expiration = this.getTokenExpiration(token);
    const expired = this.isTokenExpired(token);
    const valid = payload !== null && !expired;

    return { valid, expired, payload, expiration };
  }
}