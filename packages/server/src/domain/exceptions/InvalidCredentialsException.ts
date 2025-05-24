import { AuthenticationError } from '../../shared/errors/AuthenticationError';

export class InvalidCredentialsException extends AuthenticationError {
  constructor() {
    super('Invalid email or password', 'INVALID_CREDENTIALS');
  }
}