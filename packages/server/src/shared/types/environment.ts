export interface Environment {
  NODE_ENV: 'development' | 'production' | 'test';
  PORT: number;
  
  // Database
  MONGODB_URI: string;
  
  // JWT
  JWT_SECRET: string;
  JWT_ACCESS_EXPIRES_IN: string;
  JWT_REFRESH_EXPIRES_IN: string;
  
  // OAuth
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  GOOGLE_CALLBACK_URL: string;
  
  // Email
  EMAIL_PROVIDER: 'nodemailer' | 'ses';
  SMTP_HOST: string;
  SMTP_PORT: number;
  SMTP_USER: string;
  SMTP_PASS: string;
  EMAIL_FROM: string;
  EMAIL_FROM_NAME: string;
  
  // AWS (if using SES)
  AWS_REGION: string;
  AWS_ACCESS_KEY_ID: string;
  AWS_SECRET_ACCESS_KEY: string;
  
  // Frontend
  FRONTEND_URL: string;
  DEFAULT_REDIRECT_URL: string;
  
  // Security
  SESSION_SECRET: string;
  BCRYPT_ROUNDS: number;
  
  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: number;
  RATE_LIMIT_MAX_REQUESTS: number;
}
