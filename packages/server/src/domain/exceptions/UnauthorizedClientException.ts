import { AuthorizationError } from '../../shared/errors/AuthorizationError';

export class UnauthorizedClientException extends AuthorizationError {
  constructor(clientId: string) {
    super(`Unauthorized client: ${clientId}`, 'access', 'oauth_client', undefined);
  }
}