import { logger } from '../../shared/utils/logger';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface SerializedTokens {
  accessToken: string;
  refreshToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
  expiresAt: string;
}

export interface TokenInfo {
  type: string;
  expiresAt: string;
  issuedAt: string;
}

export class TokenSerializer {
  private readonly logger = logger.setContext({ serializer: 'TokenSerializer' });

  /**
   * Serialize token pair for API response
   */
  public serialize(tokens: TokenPair, expiresIn: number = 3600): SerializedTokens {
    try {
      const expiresAt = new Date(Date.now() + expiresIn * 1000);

      return {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        tokenType: 'Bearer',
        expiresIn,
        expiresAt: expiresAt.toISOString()
      };
    } catch (error) {
      this.logger.error('Error serializing tokens', { 
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Serialize only access token (for refresh responses)
   */
  public serializeAccessToken(accessToken: string, expiresIn: number = 3600): Omit<SerializedTokens, 'refreshToken'> {
    try {
      const expiresAt = new Date(Date.now() + expiresIn * 1000);

      return {
        accessToken,
        tokenType: 'Bearer',
        expiresIn,
        expiresAt: expiresAt.toISOString()
      };
    } catch (error) {
      this.logger.error('Error serializing access token', { 
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Serialize token information (without actual token values)
   */
  public serializeTokenInfo(payload: any): TokenInfo {
    try {
      return {
        type: payload.type || 'unknown',
        expiresAt: new Date(payload.exp * 1000).toISOString(),
        issuedAt: new Date(payload.iat * 1000).toISOString()
      };
    } catch (error) {
      this.logger.error('Error serializing token info', { 
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Create safe headers for token transmission
   */
  public createAuthHeaders(token: string): { Authorization: string } {
    return {
      Authorization: `Bearer ${token}`
    };
  }

  /**
   * Extract token from authorization header
   */
  public extractTokenFromHeader(authHeader?: string): string | null {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }
    return authHeader.substring(7);
  }

  /**
   * Mask token for logging purposes
   */
  public maskToken(token: string): string {
    if (!token || token.length < 10) {
      return '[INVALID_TOKEN]';
    }
    return `${token.substring(0, 10)}...${token.substring(token.length - 4)}`;
  }
}