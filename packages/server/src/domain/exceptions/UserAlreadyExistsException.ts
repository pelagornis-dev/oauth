import { BaseError } from '../../shared/errors/BaseError';
import { HTTP_STATUS } from '../../shared/constants/httpStatus';

export class UserAlreadyExistsException extends BaseError {
  constructor(email: string) {
    super(
      `User with email ${email} already exists`,
      HTTP_STATUS.CONFLICT,
      true,
      { email }
    );
  }
}