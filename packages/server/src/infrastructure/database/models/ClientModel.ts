import * as mongoose from 'mongoose';
import { GrantType } from '../../../domain/entities/Client';

export interface IClientDocument extends mongoose.Document {
  name: string;
  clientId: string;
  clientSecret: string;
  redirectUris: string[];
  grants: string[];
  createdAt: Date;
  updatedAt: Date;
}

const clientSchema = new mongoose.Schema({
  name: { type: String, required: true },
  clientId: { type: String, required: true, unique: true },
  clientSecret: { type: String, required: true },
  redirectUris: [{ type: String }],
  grants: [{ 
    type: String, 
    enum: Object.values(GrantType)
  }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

export const ClientModel = mongoose.model<IClientDocument>('Client', clientSchema);
