export class ValidationUtils {
  /**
   * Check if email format is valid
   */
  public static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim().toLowerCase());
  }

  /**
   * Check if password meets security requirements
   */
  public static isValidPassword(password: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }
    
    if (!/(?=.*[a-z])/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }
    
    if (!/(?=.*[A-Z])/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }
    
    if (!/(?=.*\d)/.test(password)) {
      errors.push('Password must contain at least one number');
    }
    
    if (!/(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])/.test(password)) {
      errors.push('Password must contain at least one special character');
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Check if URL is valid
   */
  public static isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check if phone number is valid (basic validation)
   */
  public static isValidPhoneNumber(phone: string): boolean {
    const phoneRegex = /^\+?[\d\s\-\(\)]{7,}$/;
    return phoneRegex.test(phone.trim());
  }

  /**
   * Sanitize string input to prevent XSS
   */
  public static sanitizeString(input: string): string {
    return input
      .replace(/[<>]/g, '') // Remove potential HTML tags
      .replace(/['"]/g, '') // Remove quotes
      .trim();
  }

  /**
   * Check if MongoDB ObjectId is valid
   */
  public static isValidObjectId(id: string): boolean {
    const objectIdRegex = /^[0-9a-fA-F]{24}$/;
    return objectIdRegex.test(id);
  }

  /**
   * Validate JSON Web Token format (basic structure check)
   */
  public static isValidJWTFormat(token: string): boolean {
    const parts = token.split('.');
    return parts.length === 3 && parts.every(part => part.length > 0);
  }

  /**
   * Check if string contains only alphanumeric characters
   */
  public static isAlphanumeric(str: string): boolean {
    const alphanumericRegex = /^[a-zA-Z0-9]+$/;
    return alphanumericRegex.test(str);
  }

  /**
   * Validate enum value
   */
  public static isValidEnumValue<T>(value: any, enumObject: T): value is T[keyof T] {
    return Object.values(enumObject as any).includes(value);
  }

  /**
   * Check if date string is valid
   */
  public static isValidDate(dateString: string): boolean {
    const date = new Date(dateString);
    return !isNaN(date.getTime());
  }

  /**
   * Check if value is within range
   */
  public static isInRange(value: number, min: number, max: number): boolean {
    return value >= min && value <= max;
  }
}