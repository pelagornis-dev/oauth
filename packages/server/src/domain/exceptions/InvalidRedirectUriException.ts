import { BaseError } from '../../shared/errors/BaseError';
import { HTTP_STATUS } from '../../shared/constants/httpStatus';

export class InvalidRedirectUriException extends BaseError {
  constructor(uri: string) {
    super(
      `Invalid redirect URI: ${uri}`,
      HTTP_STATUS.BAD_REQUEST,
      true,
      { uri }
    );
  }
}