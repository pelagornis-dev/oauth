export interface RegisterRequestDto {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  clientId?: string;
  redirectUri?: string;
}
