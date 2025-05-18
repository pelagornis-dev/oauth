import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { User } from '../entities/User';
import { Client } from '../entities/Client';
import { Token } from '../entities/Token';
import { UserRepository } from '../repositories/UserRepository';
import { TokenRepository, TokenData } from '../repositories/TokenRepository';
import { ClientRepository } from '../repositories/ClientRepository';

export class AuthUseCase {
  constructor(
    private userRepository: UserRepository,
    private tokenRepository: TokenRepository,
    private clientRepository: ClientRepository
  ) {}

  async authenticateUser(username: string, password: string): Promise<User | null> {
    // 사용자 인증 로직
    const user = await this.userRepository.findByUsername(username);
    
    if (!user) {
      return null;
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return null;
    }

    return user;
  }

  async generateTokens(clientId: string, userId: string, scope?: string): Promise<TokenData> {
    // 토큰 생성 로직
    const accessToken = jwt.sign(
      { userId, clientId, scope },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
    
    const refreshToken = uuidv4();
    
    const now = new Date();
    const accessTokenExpiresAt = new Date(now.getTime() + 60 * 60 * 1000); // 1시간
    const refreshTokenExpiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30일
    
    const token: TokenData = {
      accessToken,
      accessTokenExpiresAt,
      refreshToken,
      refreshTokenExpiresAt,
      clientId,
      userId,
      scope
    };
    
    await this.tokenRepository.create(token);
    
    return token;
  }

  async validateClient(clientId: string, clientSecret: string): Promise<Client | null> {
    // 클라이언트 검증 로직
    const client = await this.clientRepository.findByClientId(clientId);
    
    if (!client || client.clientSecret !== clientSecret) {
      return null;
    }
    
    return client;
  }

  async refreshToken(refreshToken: string): Promise<TokenData | null> {
    // 토큰 갱신 로직
    const token = await this.tokenRepository.findByRefreshToken(refreshToken);
    
    if (!token || new Date() > token.refreshTokenExpiresAt) {
      return null;
    }
    
    await this.tokenRepository.deleteByAccessToken(token.accessToken);
    
    return this.generateTokens(token.clientId, token.userId, token.scope);
  }
}