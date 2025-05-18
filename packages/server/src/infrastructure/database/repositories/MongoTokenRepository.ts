import { TokenModel } from '../models/TokenModel';
import { Token } from '../../../domain/entities/Token';
import { TokenRepository, TokenData } from '../../../domain/repositories/TokenRepository';

export class MongoTokenRepository implements TokenRepository {
  async create(tokenData: TokenData): Promise<Token> {
    const token = new TokenModel(tokenData);
    
    await token.save();
    
    return new Token(
      token._id.toString(),
      token.accessToken,
      token.accessTokenExpiresAt,
      token.refreshToken,
      token.refreshTokenExpiresAt,
      token.clientId,
      token.userId,
      token.scope
    );
  }

  async findByAccessToken(accessToken: string): Promise<Token | null> {
    const token = await TokenModel.findOne({ accessToken });
    if (!token) return null;
    
    return new Token(
      token._id.toString(),
      token.accessToken,
      token.accessTokenExpiresAt,
      token.refreshToken,
      token.refreshTokenExpiresAt,
      token.clientId,
      token.userId,
      token.scope
    );
  }

  async findByRefreshToken(refreshToken: string): Promise<Token | null> {
    const token = await TokenModel.findOne({ refreshToken });
    if (!token) return null;
    
    return new Token(
      token._id.toString(),
      token.accessToken,
      token.accessTokenExpiresAt,
      token.refreshToken,
      token.refreshTokenExpiresAt,
      token.clientId,
      token.userId,
      token.scope
    );
  }

  async deleteByAccessToken(accessToken: string): Promise<boolean> {
    const result = await TokenModel.deleteOne({ accessToken });
    return result.deletedCount > 0;
  }

  async deleteByClientAndUser(clientId: string, userId: string): Promise<boolean> {
    const result = await TokenModel.deleteMany({ clientId, userId });
    return result.deletedCount > 0;
  }
}