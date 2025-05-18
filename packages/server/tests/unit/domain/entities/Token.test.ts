import { describe, it, expect } from 'vitest';
import { Token } from '../../../../domain/entities/Token';

describe('Token Entity', () => {
  it('should create a Token instance with the provided properties', () => {
    // 준비
    const id = '123';
    const accessToken = 'access-token-xyz';
    const accessTokenExpiresAt = new Date('2023-12-31T23:59:59Z');
    const refreshToken = 'refresh-token-abc';
    const refreshTokenExpiresAt = new Date('2024-01-31T23:59:59Z');
    const clientId = 'client-123';
    const userId = 'user-456';
    const scope = 'read write';

    // 실행
    const token = new Token(
      id, 
      accessToken, 
      accessTokenExpiresAt, 
      refreshToken, 
      refreshTokenExpiresAt, 
      clientId, 
      userId, 
      scope
    );

    // 검증
    expect(token.id).toBe(id);
    expect(token.accessToken).toBe(accessToken);
    expect(token.accessTokenExpiresAt).toBe(accessTokenExpiresAt);
    expect(token.refreshToken).toBe(refreshToken);
    expect(token.refreshTokenExpiresAt).toBe(refreshTokenExpiresAt);
    expect(token.clientId).toBe(clientId);
    expect(token.userId).toBe(userId);
    expect(token.scope).toBe(scope);
  });

  it('should create a Token instance without scope', () => {
    // 준비
    const id = '456';
    const accessToken = 'access-token-def';
    const accessTokenExpiresAt = new Date('2023-12-31T23:59:59Z');
    const refreshToken = 'refresh-token-ghi';
    const refreshTokenExpiresAt = new Date('2024-01-31T23:59:59Z');
    const clientId = 'client-789';
    const userId = 'user-abc';

    // 실행
    const token = new Token(
      id, 
      accessToken, 
      accessTokenExpiresAt, 
      refreshToken, 
      refreshTokenExpiresAt, 
      clientId, 
      userId
    );

    // 검증
    expect(token.id).toBe(id);
    expect(token.accessToken).toBe(accessToken);
    expect(token.accessTokenExpiresAt).toBe(accessTokenExpiresAt);
    expect(token.refreshToken).toBe(refreshToken);
    expect(token.refreshTokenExpiresAt).toBe(refreshTokenExpiresAt);
    expect(token.clientId).toBe(clientId);
    expect(token.userId).toBe(userId);
    expect(token.scope).toBeUndefined();
  });
});