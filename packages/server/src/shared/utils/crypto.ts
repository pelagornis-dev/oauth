import crypto from 'crypto';

export class CryptoUtils {
  /**
   * Generate a cryptographically secure random string
   */
  public static generateRandomString(length: number = 32, encoding: BufferEncoding = 'hex'): string {
    const bytes = Math.ceil(length / 2);
    return crypto.randomBytes(bytes).toString(encoding).slice(0, length);
  }

  /**
   * Generate a secure random UUID v4
   */
  public static generateUUID(): string {
    return crypto.randomUUID();
  }

  /**
   * Generate a random token suitable for authentication/verification
   */
  public static generateToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('base64url');
  }

  /**
   * Generate a secure random password
   */
  public static generatePassword(length: number = 16): string {
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';
    
    // Ensure at least one of each required character type
    const requiredChars = [
      'ABCDEFGHIJKLMNOPQRSTUVWXYZ',  // uppercase
      'abcdefghijklmnopqrstuvwxyz',  // lowercase
      '0123456789',                 // numbers
      '!@#$%^&*'                   // special chars
    ];

    // Add one character from each required set
    for (const chars of requiredChars) {
      const randomIndex = crypto.randomInt(0, chars.length);
      password += chars[randomIndex];
    }

    // Fill the rest with random characters
    for (let i = password.length; i < length; i++) {
      const randomIndex = crypto.randomInt(0, charset.length);
      password += charset[randomIndex];
    }

    // Shuffle the password to avoid predictable patterns
    return password.split('').sort(() => crypto.randomInt(-1, 2)).join('');
  }

  /**
   * Create a hash of the given data
   */
  public static hash(data: string, algorithm: string = 'sha256'): string {
    return crypto.createHash(algorithm).update(data).digest('hex');
  }

  /**
   * Create HMAC signature
   */
  public static hmac(data: string, secret: string, algorithm: string = 'sha256'): string {
    return crypto.createHmac(algorithm, secret).update(data).digest('hex');
  }

  /**
   * Compare two strings in constant time to prevent timing attacks
   */
  public static constantTimeEquals(a: string, b: string): boolean {
    if (a.length !== b.length) {
      return false;
    }
    
    const bufferA = Buffer.from(a);
    const bufferB = Buffer.from(b);
    
    return crypto.timingSafeEqual(bufferA, bufferB);
  }

  /**
   * Encrypt data using AES-256-GCM
   */
  public static encrypt(text: string, key: string): { encrypted: string; iv: string; tag: string } {
    const algorithm = 'aes-256-gcm';
    
    // Ensure key is 32 bytes for AES-256
    const keyBuffer = crypto.scryptSync(key, 'salt', 32);
    const iv = crypto.randomBytes(16);
    
    const cipher = crypto.createCipheriv(algorithm, keyBuffer, iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const tag = cipher.getAuthTag();
    
    return {
      encrypted,
      iv: iv.toString('hex'),
      tag: tag.toString('hex')
    };
  }

  /**
   * Decrypt data using AES-256-GCM
   */
  public static decrypt(encryptedData: { encrypted: string; iv: string; tag: string }, key: string): string {
    const algorithm = 'aes-256-gcm';
    
    // Ensure key is 32 bytes for AES-256
    const keyBuffer = crypto.scryptSync(key, 'salt', 32);
    const iv = Buffer.from(encryptedData.iv, 'hex');
    
    const decipher = crypto.createDecipheriv(algorithm, keyBuffer, iv);
    decipher.setAuthTag(Buffer.from(encryptedData.tag, 'hex'));
    
    let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }
}