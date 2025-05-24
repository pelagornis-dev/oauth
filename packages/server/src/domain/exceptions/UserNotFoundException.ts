import { BaseError } from '../../shared/errors/BaseError';
import { HTTP_STATUS } from '../../shared/constants/httpStatus';

export class UserNotFoundException extends BaseError {
  constructor(identifier: string) {
    super(
      `User not found: ${identifier}`,
      HTTP_STATUS.NOT_FOUND,
      true,
      { identifier }
    );
  }
}