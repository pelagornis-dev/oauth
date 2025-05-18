import { Token } from '../entities/Token';

export interface TokenData {
  accessToken: string;
  accessTokenExpiresAt: Date;
  refreshToken: string;
  refreshTokenExpiresAt: Date;
  clientId: string;
  userId: string;
  scope?: string;
}

export interface TokenRepository {
  create(tokenData: TokenData): Promise<Token>;
  findByAccessToken(accessToken: string): Promise<Token | null>;
  findByRefreshToken(refreshToken: string): Promise<Token | null>;
  deleteByAccessToken(accessToken: string): Promise<boolean>;
  deleteByClientAndUser(clientId: string, userId: string): Promise<boolean>;
}