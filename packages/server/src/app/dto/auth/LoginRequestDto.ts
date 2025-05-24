export interface LoginRequestDto {
  email: string;
  password: string;
  rememberMe?: boolean;
  clientId?: string;
  redirectUri?: string;
}
