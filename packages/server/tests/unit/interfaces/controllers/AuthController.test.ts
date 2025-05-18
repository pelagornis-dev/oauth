import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AuthController } from '../../../../interfaces/controllers/AuthController';
import { AuthUseCase } from '../../../../domain/usecases/AuthUseCase';
import { User, UserRole } from '../../../../domain/entities/User';
import { Client, GrantType } from '../../../../domain/entities/Client';
import { Request, Response } from 'express';

// 모킹
vi.mock('../../../../domain/usecases/AuthUseCase');

describe('AuthController', () => {
  let authController: AuthController;
  let mockAuthUseCase: any;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let responseJson: any;
  let responseStatus: any;
  
  beforeEach(() => {
    // AuthUseCase 모킹
    mockAuthUseCase = {
      authenticateUser: vi.fn(),
      generateTokens: vi.fn(),
      validateClient: vi.fn(),
      refreshToken: vi.fn(),
      userRepository: { findById: vi.fn() },
      clientRepository: { findByClientId: vi.fn() },
      tokenRepository: {}
    };
    
    // Response 객체 모킹
    responseJson = vi.fn().mockReturnValue({});
    responseStatus = vi.fn().mockReturnThis();
    mockResponse = {
      json: responseJson,
      status: responseStatus,
      redirect: vi.fn()
    };
    
    // AuthController 인스턴스 생성
    authController = new AuthController(mockAuthUseCase as AuthUseCase);
  });
  
  describe('login', () => {
    it('should return 401 when credentials are invalid', async () => {
      // 요청 설정
      mockRequest = {
        body: {
          username: 'testuser',
          password: 'wrongpassword'
        }
      };
      
      // authenticateUser 메서드가 null을 반환하도록 모킹
      mockAuthUseCase.authenticateUser.mockResolvedValue(null);
      
      // 컨트롤러 메서드 실행
      await authController.login(mockRequest as Request, mockResponse as Response);
      
      // 검증
      expect(mockAuthUseCase.authenticateUser).toHaveBeenCalledWith('testuser', 'wrongpassword');
      expect(responseStatus).toHaveBeenCalledWith(401);
      expect(responseJson).toHaveBeenCalledWith({ error: 'Invalid credentials' });
    });
    
    it('should return user data when credentials are valid', async () => {
      // 요청 설정
      mockRequest = {
        body: {
          username: 'testuser',
          password: 'correctpassword'
        }
      };
      
      // authenticateUser 메서드가 사용자를 반환하도록 모킹
      const mockUser = new User('1', 'testuser', 'test@example.com', 'hashedpassword', UserRole.USER);
      mockAuthUseCase.authenticateUser.mockResolvedValue(mockUser);
      
      // 컨트롤러 메서드 실행
      await authController.login(mockRequest as Request, mockResponse as Response);
      
      // 검증
      expect(mockAuthUseCase.authenticateUser).toHaveBeenCalledWith('testuser', 'correctpassword');
      expect(responseJson).toHaveBeenCalledWith({
        id: '1',
        username: 'testuser',
        email: 'test@example.com',
        role: UserRole.USER
      });
      // status는 호출되지 않았어야 함
      expect(responseStatus).not.toHaveBeenCalled();
    });
    
    it('should return 500 when an error occurs', async () => {
      // 요청 설정
      mockRequest = {
        body: {
          username: 'testuser',
          password: 'password'
        }
      };
      
      // authenticateUser 메서드가 오류를 발생시키도록 모킹
      mockAuthUseCase.authenticateUser.mockRejectedValue(new Error('Database error'));
      
      // 콘솔 오류 메시지 모킹
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      // 컨트롤러 메서드 실행
      await authController.login(mockRequest as Request, mockResponse as Response);
      
      // 검증
      expect(mockAuthUseCase.authenticateUser).toHaveBeenCalledWith('testuser', 'password');
      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(responseStatus).toHaveBeenCalledWith(500);
      expect(responseJson).toHaveBeenCalledWith({ error: 'Internal server error' });
      
      // 스파이 복원
      consoleErrorSpy.mockRestore();
    });
  });
  
  describe('token endpoint with password grant', () => {
    it('should issue tokens for valid password grant', async () => {
      // 요청 설정
      mockRequest = {
        body: {
          grant_type: GrantType.PASSWORD,
          username: 'testuser',
          password: 'correctpassword',
          client_id: 'client-123',
          client_secret: 'secret-456',
          scope: 'read write'
        }
      };
      
      // 클라이언트 검증 모킹
      const mockClient = new Client(
        '1',
        'Test Client',
        'client-123',
        'secret-456',
        ['https://example.com/callback'],
        [GrantType.PASSWORD]
      );
      mockAuthUseCase.validateClient.mockResolvedValue(mockClient);
      
      // 사용자 인증 모킹
      const mockUser = new User('user-1', 'testuser', 'test@example.com', 'hashedpassword', UserRole.USER);
      mockAuthUseCase.authenticateUser.mockResolvedValue(mockUser);
      
      // 토큰 생성 모킹
      const mockTokens = {
        accessToken: 'access-token-123',
        accessTokenExpiresAt: new Date(Date.now() + 3600 * 1000),
        refreshToken: 'refresh-token-456',
        refreshTokenExpiresAt: new Date(Date.now() + 30 * 24 * 3600 * 1000),
        clientId: 'client-123',
        userId: 'user-1',
        scope: 'read write'
      };
      mockAuthUseCase.generateTokens.mockResolvedValue(mockTokens);
      
      // 컨트롤러 메서드 실행
      await authController.token(mockRequest as Request, mockResponse as Response);
      
      // 검증
      expect(mockAuthUseCase.validateClient).toHaveBeenCalledWith('client-123', 'secret-456');
      expect(mockAuthUseCase.authenticateUser).toHaveBeenCalledWith('testuser', 'correctpassword');
      expect(mockAuthUseCase.generateTokens).toHaveBeenCalledWith('client-123', 'user-1', 'read write');
      expect(responseJson).toHaveBeenCalledWith({
        access_token: 'access-token-123',
        token_type: 'Bearer',
        expires_in: 3600,
        refresh_token: 'refresh-token-456',
        scope: 'read write'
      });
    });
    
    it('should return 401 when client credentials are invalid', async () => {
      // 요청 설정
      mockRequest = {
        body: {
          grant_type: GrantType.PASSWORD,
          username: 'testuser',
          password: 'correctpassword',
          client_id: 'client-123',
          client_secret: 'wrong-secret',
          scope: 'read write'
        }
      };
      
      // 클라이언트 검증 모킹 (잘못된 자격 증명)
      mockAuthUseCase.validateClient.mockResolvedValue(null);
      
      // 컨트롤러 메서드 실행
      await authController.token(mockRequest as Request, mockResponse as Response);
      
      // 검증
      expect(mockAuthUseCase.validateClient).toHaveBeenCalledWith('client-123', 'wrong-secret');
      expect(responseStatus).toHaveBeenCalledWith(401);
      expect(responseJson).toHaveBeenCalledWith({ error: 'Invalid client credentials' });
      // authenticateUser는 호출되지 않았어야 함
      expect(mockAuthUseCase.authenticateUser).not.toHaveBeenCalled();
    });
    
    it('should return 401 when user credentials are invalid', async () => {
      // 요청 설정
      mockRequest = {
        body: {
          grant_type: GrantType.PASSWORD,
          username: 'testuser',
          password: 'wrongpassword',
          client_id: 'client-123',
          client_secret: 'secret-456',
          scope: 'read write'
        }
      };
      
      // 클라이언트 검증 모킹
      const mockClient = new Client(
        '1',
        'Test Client',
        'client-123',
        'secret-456',
        ['https://example.com/callback'],
        [GrantType.PASSWORD]
      );
      mockAuthUseCase.validateClient.mockResolvedValue(mockClient);
      
      // 사용자 인증 모킹 (잘못된 자격 증명)
      mockAuthUseCase.authenticateUser.mockResolvedValue(null);
      
      // 컨트롤러 메서드 실행
      await authController.token(mockRequest as Request, mockResponse as Response);
      
      // 검증
      expect(mockAuthUseCase.validateClient).toHaveBeenCalledWith('client-123', 'secret-456');
      expect(mockAuthUseCase.authenticateUser).toHaveBeenCalledWith('testuser', 'wrongpassword');
      expect(responseStatus).toHaveBeenCalledWith(401);
      expect(responseJson).toHaveBeenCalledWith({ error: 'Invalid user credentials' });
      // generateTokens는 호출되지 않았어야 함
      expect(mockAuthUseCase.generateTokens).not.toHaveBeenCalled();
    });
  });
});