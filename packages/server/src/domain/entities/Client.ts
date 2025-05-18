export enum GrantType {
  AUTHORIZATION_CODE = 'authorization_code',
  CLIENT_CREDENTIALS = 'client_credentials',
  REFRESH_TOKEN = 'refresh_token',
  PASSWORD = 'password'
}

export class Client {
  constructor(
    public id: string,
    public name: string,
    public clientId: string,
    public clientSecret: string,
    public redirectUris: string[],
    public grants: GrantType[]
  ) {}
}