export interface GoogleAuthResponseDto {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    emailVerified: boolean;
    provider: string;
  };
  expiresIn: number;
  tokenType: string;
  redirectUrl: string;
}
