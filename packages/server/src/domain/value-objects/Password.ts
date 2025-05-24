import { ValidationUtils } from '../../shared/utils/validation';

export class Password {
  private readonly value: string;

  constructor(password: string, isHashed: boolean = false) {
    if (!isHashed) {
      this.validateStrength(password);
    }
    this.value = password;
  }

  getValue(): string {
    return this.value;
  }

  private validateStrength(password: string): void {
    const validation = ValidationUtils.isValidPassword(password);
    if (!validation.valid) {
      throw new Error(`Password validation failed: ${validation.errors.join(', ')}`);
    }
  }

  toString(): string {
    return '[PROTECTED]';
  }
}
