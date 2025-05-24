import { AuthorizationError } from '../../shared/errors/AuthorizationError';

export class EmailNotVerifiedException extends AuthorizationError {
  constructor() {
    super('Email address has not been verified');
  }
}
