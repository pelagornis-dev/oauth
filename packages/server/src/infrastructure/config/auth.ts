import { environment } from './environment';
import { CONFIG } from '../../shared/constants/config';
import { logger } from '@/shared';

export const authConfig = {
  jwt: {
    secret: environment.JWT_SECRET,
    algorithm: CONFIG.JWT_ALGORITHM as 'HS256',
    accessTokenExpiry: environment.JWT_ACCESS_EXPIRES_IN,
    refreshTokenExpiry: environment.JWT_REFRESH_EXPIRES_IN,
    issuer: 'pelagornis-oauth',
    audience: 'pelagornis-app'
  },
  session: {
    secret: environment.SESSION_SECRET,
    name: 'sid',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: environment.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
  },
  bcrypt: {
    rounds: environment.BCRYPT_ROUNDS
  },
  oauth: {
    google: {
      clientId: environment.GOOGLE_CLIENT_ID,
      clientSecret: environment.GOOGLE_CLIENT_SECRET,
      callbackUrl: environment.GOOGLE_CALLBACK_URL,
      scope: ['profile', 'email']
    }
  },
  rateLimit: {
    windowMs: environment.RATE_LIMIT_WINDOW_MS,
    max: environment.RATE_LIMIT_MAX_REQUESTS,
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false
  }
} as const;

export class AuthConfig {
  static validate(): void {
    if (!environment.JWT_SECRET || environment.JWT_SECRET.length < 32) {
      throw new Error('JWT_SECRET must be at least 32 characters long');
    }

    if (!environment.SESSION_SECRET || environment.SESSION_SECRET.length < 32) {
      throw new Error('SESSION_SECRET must be at least 32 characters long');
    }

    if (environment.BCRYPT_ROUNDS < CONFIG.BCRYPT_ROUNDS) {
      logger.warn(`BCRYPT_ROUNDS (${environment.BCRYPT_ROUNDS}) is below recommended value (${CONFIG.BCRYPT_ROUNDS})`);
    }
  }
}