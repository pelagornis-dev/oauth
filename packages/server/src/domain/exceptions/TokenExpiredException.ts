import { AuthenticationError } from '../../shared/errors/AuthenticationError';

export class TokenExpiredException extends AuthenticationError {
  constructor(tokenType: string) {
    super(`${tokenType} token has expired`, 'TOKEN_EXPIRED', { tokenType });
  }
}
