import { Request, Response } from 'express';
import { AuthUseCase } from '../../domain/usecases/AuthUseCase';
import { GrantType } from '../../domain/entities/Client';

export class AuthController {
  constructor(private authUseCase: AuthUseCase) {}

  login = async (req: Request, res: Response): Promise<void> => {
    try {
      const { username, password } = req.body;
      const user = await this.authUseCase.authenticateUser(username, password);
      
      if (!user) {
        res.status(401).json({ error: 'Invalid credentials' });
        return;
      }
      
      res.json({
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };

  authorize = async (req: Request, res: Response): Promise<void> => {
    try {
      const {
        client_id: clientId,
        redirect_uri: redirectUri,
        response_type: responseType,
        scope,
        state
      } = req.query;
      
      // 필수 파라미터 확인
      if (!clientId || !redirectUri || !responseType) {
        res.status(400).json({ error: 'Missing required parameters' });
        return;
      }
      
      // 클라이언트 검증
      const client = await this.authUseCase.clientRepository.findByClientId(clientId as string);
      if (!client) {
        res.status(401).json({ error: 'Invalid client' });
        return;
      }
      
      // 리다이렉트 URI 검증
      if (!client.redirectUris.includes(redirectUri as string)) {
        res.status(400).json({ error: 'Invalid redirect URI' });
        return;
      }
      
      // 응답 타입 검증 (현재는 'code'만 지원)
      if (responseType !== 'code') {
        res.status(400).json({ error: 'Unsupported response type' });
        return;
      }
      
      // 인증 성공 시 인증 코드 생성 및 리다이렉트
      // (여기서는 사용자가 이미 로그인되어 있다고 가정)
      if (!req.user) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }
      
      // 인증 코드 생성 (실제로는 더 안전한 방법 사용)
      const authorizationCode = Math.random().toString(36).substring(2, 15);
      
      // 인증 코드를 저장해야 함 (DB 등)
      // 여기서는 간단한 예제로 생략
      
      // 리다이렉트
      const redirectUrl = `${redirectUri}?code=${authorizationCode}${state ? `&state=${state}` : ''}`;
      res.redirect(redirectUrl);
    } catch (error) {
      console.error('Authorize error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };

  token = async (req: Request, res: Response): Promise<void> => {
    try {
      const { grant_type: grantType } = req.body;
      
      if (!grantType) {
        res.status(400).json({ error: 'Missing grant_type parameter' });
        return;
      }
      
      switch (grantType) {
        case GrantType.AUTHORIZATION_CODE:
          await this.handleAuthorizationCodeGrant(req, res);
          break;
        case GrantType.CLIENT_CREDENTIALS:
          await this.handleClientCredentialsGrant(req, res);
          break;
        case GrantType.REFRESH_TOKEN:
          await this.handleRefreshTokenGrant(req, res);
          break;
        case GrantType.PASSWORD:
          await this.handlePasswordGrant(req, res);
          break;
        default:
          res.status(400).json({ error: 'Unsupported grant type' });
      }
    } catch (error) {
      console.error('Token error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };

  private handleAuthorizationCodeGrant = async (req: Request, res: Response): Promise<void> => {
    // Authorization Code 그랜트 처리 로직
    const { code, client_id: clientId, client_secret: clientSecret, redirect_uri: redirectUri } = req.body;
    
    if (!code || !clientId || !clientSecret || !redirectUri) {
      res.status(400).json({ error: 'Missing required parameters' });
      return;
    }
    
    // 클라이언트 검증
    const client = await this.authUseCase.validateClient(clientId, clientSecret);
    if (!client) {
      res.status(401).json({ error: 'Invalid client credentials' });
      return;
    }
    
    // 인증 코드 검증 (실제로는 DB에서 확인)
    // 여기서는 간단한 예제로 생략
    
    // 토큰 생성 (가정: 코드에서 userId를 얻을 수 있음)
    const userId = 'user-id-from-code'; // 실제로는 코드에서 얻어야 함
    const tokens = await this.authUseCase.generateTokens(clientId, userId);
    
    res.json({
      access_token: tokens.accessToken,
      token_type: 'Bearer',
      expires_in: 3600, // 1시간
      refresh_token: tokens.refreshToken,
      scope: tokens.scope
    });
  };

  private handleClientCredentialsGrant = async (req: Request, res: Response): Promise<void> => {
    // Client Credentials 그랜트 처리 로직
    const { client_id: clientId, client_secret: clientSecret, scope } = req.body;
    
    if (!clientId || !clientSecret) {
      res.status(400).json({ error: 'Missing required parameters' });
      return;
    }
    
    // 클라이언트 검증
    const client = await this.authUseCase.validateClient(clientId, clientSecret);
    if (!client) {
      res.status(401).json({ error: 'Invalid client credentials' });
      return;
    }
    
    // 토큰 생성 (클라이언트 자체를 사용자로 취급)
    const tokens = await this.authUseCase.generateTokens(clientId, clientId, scope);
    
    res.json({
      access_token: tokens.accessToken,
      token_type: 'Bearer',
      expires_in: 3600, // 1시간
      scope: tokens.scope
    });
  };

  private handleRefreshTokenGrant = async (req: Request, res: Response): Promise<void> => {
    // Refresh Token 그랜트 처리 로직
    const { refresh_token: refreshToken, client_id: clientId, client_secret: clientSecret } = req.body;
    
    if (!refreshToken || !clientId || !clientSecret) {
      res.status(400).json({ error: 'Missing required parameters' });
      return;
    }
    
    // 클라이언트 검증
    const client = await this.authUseCase.validateClient(clientId, clientSecret);
    if (!client) {
      res.status(401).json({ error: 'Invalid client credentials' });
      return;
    }
    
    // 토큰 갱신
    const newTokens = await this.authUseCase.refreshToken(refreshToken);
    if (!newTokens) {
      res.status(401).json({ error: 'Invalid refresh token' });
      return;
    }
    
    res.json({
      access_token: newTokens.accessToken,
      token_type: 'Bearer',
      expires_in: 3600, // 1시간
      refresh_token: newTokens.refreshToken,
      scope: newTokens.scope
    });
  };

  private handlePasswordGrant = async (req: Request, res: Response): Promise<void> => {
    // Password 그랜트 처리 로직
    const { username, password, client_id: clientId, client_secret: clientSecret, scope } = req.body;
    
    if (!username || !password || !clientId || !clientSecret) {
      res.status(400).json({ error: 'Missing required parameters' });
      return;
    }
    
    // 클라이언트 검증
    const client = await this.authUseCase.validateClient(clientId, clientSecret);
    if (!client) {
      res.status(401).json({ error: 'Invalid client credentials' });
      return;
    }
    
    // 사용자 인증
    const user = await this.authUseCase.authenticateUser(username, password);
    if (!user) {
      res.status(401).json({ error: 'Invalid user credentials' });
      return;
    }
    
    // 토큰 생성
    const tokens = await this.authUseCase.generateTokens(clientId, user.id, scope);
    
    res.json({
      access_token: tokens.accessToken,
      token_type: 'Bearer',
      expires_in: 3600, // 1시간
      refresh_token: tokens.refreshToken,
      scope: tokens.scope
    });
  };
}