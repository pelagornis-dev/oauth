import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mock } from 'vitest-mock-extended';
import { AuthUseCase } from '../../../../domain/usecases/AuthUseCase';
import { User, UserRole } from '../../../../domain/entities/User';
import { Client, GrantType } from '../../../../domain/entities/Client';
import { UserRepository } from '../../../../domain/repositories/UserRepository';
import { ClientRepository } from '../../../../domain/repositories/ClientRepository';
import { TokenRepository } from '../../../../domain/repositories/TokenRepository';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';

// 모듈 모킹
vi.mock('bcrypt');
vi.mock('jsonwebtoken');
vi.mock('uuid');

describe('AuthUseCase', () => {
  let authUseCase: AuthUseCase;
  let mockUserRepository: ReturnType<typeof mock<UserRepository>>;
  let mockClientRepository: ReturnType<typeof mock<ClientRepository>>;
  let mockTokenRepository: ReturnType<typeof mock<TokenRepository>>;

  beforeEach(() => {
    // 레포지토리 모킹
    mockUserRepository = mock<UserRepository>();
    mockClientRepository = mock<ClientRepository>();
    mockTokenRepository = mock<TokenRepository>();

    // AuthUseCase 인스턴스 생성
    authUseCase = new AuthUseCase(
      mockUserRepository,
      mockTokenRepository,
      mockClientRepository
    );

    // 환경 변수 모킹
    process.env.JWT_SECRET = 'test-secret';

    // bcrypt.compare 모킹
    vi.mocked(bcrypt.compare).mockImplementation(async (password, hash) => {
      return password === 'correctpassword';
    });

    // jwt.sign 모킹
    vi.mocked(jwt.sign).mockImplementation(() => 'mocked-jwt-token');

    // uuid 모킹
    vi.mocked(uuidv4).mockImplementation(() => 'mocked-uuid');
  });

  describe('authenticateUser', () => {
    it('should return null when user is not found', async () => {
      mockUserRepository.findByUsername.mockResolvedValue(null);

      const result = await authUseCase.authenticateUser('testuser', 'password');

      expect(result).toBeNull();
      expect(mockUserRepository.findByUsername).toHaveBeenCalledWith('testuser');
    });

    it('should return null when password does not match', async () => {
      const mockUser = new User('1', 'testuser', 'test@example.com', 'hashedpassword', UserRole.USER);
      mockUserRepository.findByUsername.mockResolvedValue(mockUser);

      const result = await authUseCase.authenticateUser('testuser', 'wrongpassword');

      expect(result).toBeNull();
      expect(mockUserRepository.findByUsername).toHaveBeenCalledWith('testuser');
      expect(bcrypt.compare).toHaveBeenCalledWith('wrongpassword', 'hashedpassword');
    });

    it('should return user when credentials are valid', async () => {
      const mockUser = new User('1', 'testuser', 'test@example.com', 'hashedpassword', UserRole.USER);
      mockUserRepository.findByUsername.mockResolvedValue(mockUser);

      const result = await authUseCase.authenticateUser('testuser', 'correctpassword');

      expect(result).toEqual(mockUser);
      expect(mockUserRepository.findByUsername).toHaveBeenCalledWith('testuser');
      expect(bcrypt.compare).toHaveBeenCalledWith('correctpassword', 'hashedpassword');
    });
  });

  describe('generateTokens', () => {
    it('should generate and store tokens', async () => {
      const clientId = 'client-123';
      const userId = 'user-456';
      const scope = 'read write';

      // 토큰 생성 전 Date 객체를 모킹
      const nowMock = new Date('2023-01-01T00:00:00Z');
      vi.spyOn(global, 'Date').mockImplementation(() => nowMock as unknown as Date);

      // tokenRepository.create 모킹
      mockTokenRepository.create.mockImplementation(async (tokenData) => {
        return {
          id: 'token-789',
          ...tokenData
        };
      });

      const result = await authUseCase.generateTokens(clientId, userId, scope);

      // jwt.sign이 올바른 인자로 호출되었는지 확인
      expect(jwt.sign).toHaveBeenCalledWith(
        { userId, clientId, scope },
        'test-secret',
        { expiresIn: '1h' }
      );

      // 결과 검증
      expect(result).toEqual({
        accessToken: 'mocked-jwt-token',
        accessTokenExpiresAt: new Date(nowMock.getTime() + 60 * 60 * 1000),
        refreshToken: 'mocked-uuid',
        refreshTokenExpiresAt: new Date(nowMock.getTime() + 30 * 24 * 60 * 60 * 1000),
        clientId,
        userId,
        scope
      });

      // tokenRepository.create가 올바른 인자로 호출되었는지 확인
      expect(mockTokenRepository.create).toHaveBeenCalledWith({
        accessToken: 'mocked-jwt-token',
        accessTokenExpiresAt: new Date(nowMock.getTime() + 60 * 60 * 1000),
        refreshToken: 'mocked-uuid',
        refreshTokenExpiresAt: new Date(nowMock.getTime() + 30 * 24 * 60 * 60 * 1000),
        clientId,
        userId,
        scope
      });

      // Date 모킹 복원
      vi.restoreAllMocks();
    });
  });

  describe('validateClient', () => {
    it('should return null when client is not found', async () => {
      mockClientRepository.findByClientId.mockResolvedValue(null);

      const result = await authUseCase.validateClient('client-123', 'secret');

      expect(result).toBeNull();
      expect(mockClientRepository.findByClientId).toHaveBeenCalledWith('client-123');
    });

    it('should return null when client secret does not match', async () => {
      const mockClient = new Client(
        '1',
        'Test Client',
        'client-123',
        'correct-secret',
        ['https://example.com/callback'],
        [GrantType.AUTHORIZATION_CODE]
      );
      mockClientRepository.findByClientId.mockResolvedValue(mockClient);

      const result = await authUseCase.validateClient('client-123', 'wrong-secret');

      expect(result).toBeNull();
      expect(mockClientRepository.findByClientId).toHaveBeenCalledWith('client-123');
    });

    it('should return client when credentials are valid', async () => {
      const mockClient = new Client(
        '1',
        'Test Client',
        'client-123',
        'correct-secret',
        ['https://example.com/callback'],
        [GrantType.AUTHORIZATION_CODE]
      );
      mockClientRepository.findByClientId.mockResolvedValue(mockClient);

      const result = await authUseCase.validateClient('client-123', 'correct-secret');

      expect(result).toEqual(mockClient);
      expect(mockClientRepository.findByClientId).toHaveBeenCalledWith('client-123');
    });
  });

  describe('refreshToken', () => {
    it('should return null when refresh token is not found', async () => {
      mockTokenRepository.findByRefreshToken.mockResolvedValue(null);

      const result = await authUseCase.refreshToken('refresh-token');

      expect(result).toBeNull();
      expect(mockTokenRepository.findByRefreshToken).toHaveBeenCalledWith('refresh-token');
    });

    it('should return null when refresh token is expired', async () => {
      const expiredDate = new Date();
      expiredDate.setDate(expiredDate.getDate() - 1); // 어제 만료됨

      const mockToken = {
        id: 'token-1',
        accessToken: 'access-token',
        accessTokenExpiresAt: new Date(),
        refreshToken: 'refresh-token',
        refreshTokenExpiresAt: expiredDate, // 이미 만료됨
        clientId: 'client-123',
        userId: 'user-456',
        scope: 'read'
      };

      mockTokenRepository.findByRefreshToken.mockResolvedValue(mockToken);

      const result = await authUseCase.refreshToken('refresh-token');

      expect(result).toBeNull();
      expect(mockTokenRepository.findByRefreshToken).toHaveBeenCalledWith('refresh-token');
      expect(mockTokenRepository.deleteByAccessToken).not.toHaveBeenCalled();
    });

    it('should generate new tokens when refresh token is valid', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30); // 30일 후 만료

      const mockToken = {
        id: 'token-1',
        accessToken: 'old-access-token',
        accessTokenExpiresAt: new Date(),
        refreshToken: 'refresh-token',
        refreshTokenExpiresAt: futureDate, // 유효함
        clientId: 'client-123',
        userId: 'user-456',
        scope: 'read'
      };

      const newTokens = {
        accessToken: 'new-access-token',
        accessTokenExpiresAt: new Date(),
        refreshToken: 'new-refresh-token',
        refreshTokenExpiresAt: new Date(),
        clientId: 'client-123',
        userId: 'user-456',
        scope: 'read'
      };

      mockTokenRepository.findByRefreshToken.mockResolvedValue(mockToken);
      mockTokenRepository.deleteByAccessToken.mockResolvedValue(true);

      // generateTokens를 모킹하여 새 토큰을 반환하도록 설정
      const generateTokensSpy = vi.spyOn(authUseCase, 'generateTokens').mockResolvedValue(newTokens);

      const result = await authUseCase.refreshToken('refresh-token');

      expect(result).toEqual(newTokens);
      expect(mockTokenRepository.findByRefreshToken).toHaveBeenCalledWith('refresh-token');
      expect(mockTokenRepository.deleteByAccessToken).toHaveBeenCalledWith('old-access-token');
      expect(generateTokensSpy).toHaveBeenCalledWith(
        mockToken.clientId,
        mockToken.userId,
        mockToken.scope
      );

      // 모킹 복원
      generateTokensSpy.mockRestore();
    });
  });
});