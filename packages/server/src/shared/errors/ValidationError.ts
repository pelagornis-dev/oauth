import { BaseError } from './BaseError';

export class ValidationError extends BaseError {
  public readonly field?: string;
  public readonly value?: any;
  public readonly constraint?: string;

  constructor(
    message: string,
    field?: string,
    value?: any,
    constraint?: string,
    context?: Record<string, any>
  ) {
    super(message, 400, true, context);
    
    this.field = field;
    this.value = value;
    this.constraint = constraint;
  }

  public static create(
    field: string,
    value: any,
    constraint: string,
    customMessage?: string
  ): ValidationError {
    const message = customMessage || `Validation failed for field '${field}': ${constraint}`;
    return new ValidationError(message, field, value, constraint);
  }

  public static createMultiple(
    violations: Array<{
      field: string;
      value: any;
      constraint: string;
      message?: string;
    }>
  ): ValidationError {
    const message = `Multiple validation errors: ${violations.length} field(s) failed validation`;
    return new ValidationError(message, undefined, undefined, undefined, {
      violations
    });
  }

  public toJSON(): Record<string, any> {
    return {
      ...super.toJSON(),
      field: this.field,
      value: this.value,
      constraint: this.constraint
    };
  }
}