export class Token {
  constructor(
    public id: string,
    public accessToken: string,
    public accessTokenExpiresAt: Date,
    public refreshToken: string,
    public refreshTokenExpiresAt: Date,
    public clientId: string,
    public userId: string,
    public scope?: string
  ) {}
}