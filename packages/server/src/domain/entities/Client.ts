import { ValidationUtils } from '../../shared/utils/validation';
import { logger } from '../../shared/utils/logger';

export class Client {
  private id: string;
  private name: string;
  private secret: string;
  private redirectUris: string[];
  private grants: string[];
  private scopes: string[];
  private trusted: boolean;
  private createdAt: Date;
  private updatedAt: Date;

  constructor(
    id: string,
    name: string,
    secret: string,
    redirectUris: string[] = [],
    grants: string[] = ['authorization_code', 'refresh_token'],
    scopes: string[] = ['read', 'write']
  ) {
    // Validate redirect URIs
    for (const uri of redirectUris) {
      if (!ValidationUtils.isValidUrl(uri)) {
        throw new Error(`Invalid redirect URI: ${uri}`);
      }
    }

    this.id = id;
    this.name = name;
    this.secret = secret;
    this.redirectUris = redirectUris;
    this.grants = grants;
    this.scopes = scopes;
    this.trusted = false;
    this.createdAt = new Date();
    this.updatedAt = new Date();

    logger.debug('OAuth Client created', {
      clientId: this.id,
      name: this.name,
      redirectUris: this.redirectUris.length
    });
  }

  // Getters
  getId(): string { return this.id; }
  getName(): string { return this.name; }
  getSecret(): string { return this.secret; }
  getRedirectUris(): string[] { return [...this.redirectUris]; }
  getGrants(): string[] { return [...this.grants]; }
  getScopes(): string[] { return [...this.scopes]; }
  isTrusted(): boolean { return this.trusted; }
  getCreatedAt(): Date { return this.createdAt; }
  getUpdatedAt(): Date { return this.updatedAt; }

  // Business Logic
  isValidRedirectUri(uri: string): boolean {
    const isValid = this.redirectUris.includes(uri);
    
    if (!isValid) {
      logger.warn('Invalid redirect URI attempted', {
        clientId: this.id,
        attemptedUri: uri,
        validUris: this.redirectUris
      });
    }
    
    return isValid;
  }

  hasGrant(grant: string): boolean {
    return this.grants.includes(grant);
  }

  hasScope(scope: string): boolean {
    return this.scopes.includes(scope);
  }

  addRedirectUri(uri: string): void {
    if (!ValidationUtils.isValidUrl(uri)) {
      throw new Error(`Invalid URL format: ${uri}`);
    }
    
    if (!this.redirectUris.includes(uri)) {
      logger.info('Redirect URI added to client', {
        clientId: this.id,
        newUri: uri
      });
      
      this.redirectUris.push(uri);
      this.updatedAt = new Date();
    }
  }

  removeRedirectUri(uri: string): void {
    const index = this.redirectUris.indexOf(uri);
    if (index > -1) {
      logger.info('Redirect URI removed from client', {
        clientId: this.id,
        removedUri: uri
      });
      
      this.redirectUris.splice(index, 1);
      this.updatedAt = new Date();
    }
  }

  setTrusted(trusted: boolean): void {
    logger.info('Client trust level changed', {
      clientId: this.id,
      trusted
    });
    
    this.trusted = trusted;
    this.updatedAt = new Date();
  }

  validateRedirectUris(): boolean {
    return this.redirectUris.every(uri => ValidationUtils.isValidUrl(uri));
  }
}