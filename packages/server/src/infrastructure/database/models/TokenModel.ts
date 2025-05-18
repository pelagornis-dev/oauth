import * as mongoose from 'mongoose';

export interface ITokenDocument extends mongoose.Document {
  accessToken: string;
  accessTokenExpiresAt: Date;
  refreshToken: string;
  refreshTokenExpiresAt: Date;
  clientId: string;
  userId: string;
  scope?: string;
  createdAt: Date;
}

const tokenSchema = new mongoose.Schema({
  accessToken: { type: String, required: true, unique: true },
  accessTokenExpiresAt: { type: Date, required: true },
  refreshToken: { type: String, required: true, unique: true },
  refreshTokenExpiresAt: { type: Date, required: true },
  clientId: { type: String, required: true },
  userId: { type: String, required: true },
  scope: { type: String },
  createdAt: { type: Date, default: Date.now }
});

export const TokenModel = mongoose.model<ITokenDocument>('Token', tokenSchema);