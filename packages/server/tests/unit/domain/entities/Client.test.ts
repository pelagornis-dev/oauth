import { describe, it, expect } from 'vitest';
import { Client, GrantType } from '../../../../domain/entities/Client';

describe('Client Entity', () => {
  it('should create a Client instance with the provided properties', () => {
    // 준비
    const id = '123';
    const name = 'Test Client';
    const clientId = 'client-123';
    const clientSecret = 'secret-456';
    const redirectUris = ['https://example.com/callback'];
    const grants = [GrantType.AUTHORIZATION_CODE, GrantType.REFRESH_TOKEN];

    // 실행
    const client = new Client(id, name, clientId, clientSecret, redirectUris, grants);

    // 검증
    expect(client.id).toBe(id);
    expect(client.name).toBe(name);
    expect(client.clientId).toBe(clientId);
    expect(client.clientSecret).toBe(clientSecret);
    expect(client.redirectUris).toEqual(redirectUris);
    expect(client.grants).toEqual(grants);
  });

  it('should create a Client instance with multiple redirect URIs', () => {
    // 준비
    const id = '456';
    const name = 'Multi URI Client';
    const clientId = 'client-456';
    const clientSecret = 'secret-789';
    const redirectUris = [
      'https://example.com/callback',
      'https://example.com/redirect',
      'https://example.com/oauth/callback'
    ];
    const grants = [GrantType.AUTHORIZATION_CODE];

    // 실행
    const client = new Client(id, name, clientId, clientSecret, redirectUris, grants);

    // 검증
    expect(client.id).toBe(id);
    expect(client.name).toBe(name);
    expect(client.clientId).toBe(clientId);
    expect(client.clientSecret).toBe(clientSecret);
    expect(client.redirectUris).toEqual(redirectUris);
    expect(client.grants).toEqual(grants);
    expect(client.redirectUris.length).toBe(3);
  });

  it('should create a Client instance with multiple grant types', () => {
    // 준비
    const id = '789';
    const name = 'Multi Grant Client';
    const clientId = 'client-789';
    const clientSecret = 'secret-abc';
    const redirectUris = ['https://example.com/callback'];
    const grants = [
      GrantType.AUTHORIZATION_CODE,
      GrantType.CLIENT_CREDENTIALS,
      GrantType.PASSWORD,
      GrantType.REFRESH_TOKEN
    ];

    // 실행
    const client = new Client(id, name, clientId, clientSecret, redirectUris, grants);

    // 검증
    expect(client.id).toBe(id);
    expect(client.name).toBe(name);
    expect(client.clientId).toBe(clientId);
    expect(client.clientSecret).toBe(clientSecret);
    expect(client.redirectUris).toEqual(redirectUris);
    expect(client.grants).toEqual(grants);
    expect(client.grants.length).toBe(4);
  });
});