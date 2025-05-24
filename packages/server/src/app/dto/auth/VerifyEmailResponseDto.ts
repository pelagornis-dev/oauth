export interface VerifyEmailResponseDto {
  message: string;
  user: {
    id: string;
    email: string;
    emailVerified: boolean;
  };
  redirectUrl?: string;
}