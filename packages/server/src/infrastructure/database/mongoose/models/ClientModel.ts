import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IClientDocument extends Document {
  _id: Types.ObjectId;
  name: string;
  secret: string;
  redirectUris: string[];
  grants: string[];
  scopes: string[];
  trusted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ClientSchema = new Schema<IClientDocument>({
  name: {
    type: String,
    required: true,
    trim: true
  },
  secret: {
    type: String,
    required: true
  },
  redirectUris: [{
    type: String,
    required: true
  }],
  grants: [{
    type: String,
    required: true
  }],
  scopes: [{
    type: String,
    required: true
  }],
  trusted: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

export const ClientModel = mongoose.model<IClientDocument>('Client', ClientSchema);
