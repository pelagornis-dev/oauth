import { BaseError } from './BaseError';

export class AuthorizationError extends BaseError {
  public readonly action?: string;
  public readonly resource?: string;
  public readonly requiredPermissions?: string[];

  constructor(
    message: string = 'Access denied',
    action?: string,
    resource?: string,
    requiredPermissions?: string[]
  ) {
    super(message, 403, true, {
      action,
      resource,
      requiredPermissions
    });
    
    this.action = action;
    this.resource = resource;
    this.requiredPermissions = requiredPermissions;
  }

  public static insufficientPermissions(
    action: string,
    resource: string,
    requiredPermissions: string[]
  ): AuthorizationError {
    return new AuthorizationError(
      `Insufficient permissions to ${action} ${resource}`,
      action,
      resource,
      requiredPermissions
    );
  }

  public static emailNotVerified(): AuthorizationError {
    return new AuthorizationError(
      'Email verification is required to access this resource',
      'access',
      'protected_resource'
    );
  }

  public static accountSuspended(): AuthorizationError {
    return new AuthorizationError(
      'Account has been suspended and cannot access this resource',
      'access',
      'any_resource'
    );
  }

  public static resourceNotOwned(): AuthorizationError {
    return new AuthorizationError(
      'You can only access your own resources',
      'access',
      'owned_resource'
    );
  }

  public toJSON(): Record<string, any> {
    return {
      ...super.toJSON(),
      action: this.action,
      resource: this.resource,
      requiredPermissions: this.requiredPermissions
    };
  }
}