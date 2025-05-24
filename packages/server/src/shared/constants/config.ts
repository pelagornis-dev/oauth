export const CONFIG = {
  // Pagination
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
  
  // Rate Limiting
  DEFAULT_RATE_LIMIT_WINDOW: 15 * 60 * 1000, // 15 minutes
  DEFAULT_RATE_LIMIT_MAX: 100,
  
  // Token Expiration
  DEFAULT_ACCESS_TOKEN_EXPIRY: '1h',
  DEFAULT_REFRESH_TOKEN_EXPIRY: '7d',
  DEFAULT_VERIFICATION_TOKEN_EXPIRY: 24 * 60 * 60 * 1000, // 24 hours
  DEFAULT_RESET_TOKEN_EXPIRY: 60 * 60 * 1000, // 1 hour
  
  // Password Policy
  MIN_PASSWORD_LENGTH: 8,
  MAX_PASSWORD_LENGTH: 128,
  
  // File Upload
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  ALLOWED_FILE_TYPES: ['image/jpeg', 'image/png', 'image/gif'],
  
  // Security
  BCRYPT_ROUNDS: 12,
  JWT_ALGORITHM: 'HS256',
  
  // Database
  DB_CONNECTION_TIMEOUT: 30000,
  DB_MAX_CONNECTIONS: 10,
  
  // Email
  EMAIL_QUEUE_DELAY: 1000, // 1 second
  MAX_EMAIL_RETRIES: 3,
  
  // Cache
  DEFAULT_CACHE_TTL: 300, // 5 minutes
  
  // API
  API_VERSION: 'v1',
  API_PREFIX: '/api'
} as const;
