export interface TokenPayload {
  sub: string;
  email: string;
  type: string;
  iat?: number;
  exp?: number;
}

export interface ITokenService {
  generateAccessToken(payload: TokenPayload): Promise<string>;
  generateRefreshToken(payload: TokenPayload): Promise<string>;
  generateVerificationToken(): Promise<string>;
  verifyToken(token: string): Promise<TokenPayload>;
  decodeToken(token: string): TokenPayload | null;
  getTokenExpiration(token: string): Date | null;
}