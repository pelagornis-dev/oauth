import { AuthenticationError } from '../../shared/errors/AuthenticationError';

export class InvalidTokenException extends AuthenticationError {
  constructor(tokenType: string) {
    super(`Invalid ${tokenType} token`, 'INVALID_TOKEN', { tokenType });
  }
}