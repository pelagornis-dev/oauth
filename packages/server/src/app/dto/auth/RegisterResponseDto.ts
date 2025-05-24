export interface RegisterResponseDto {
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    emailVerified: boolean;
  };
  message: string;
  verificationEmailSent: boolean;
}