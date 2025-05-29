import mongoose, { Schema, Document, Types } from 'mongoose';
import { TokenType } from '../../../../domain/enums/TokenType';

export interface ITokenDocument extends Document {
  _id: Types.ObjectId;
  userId: string;
  type: TokenType;
  value: string;
  expiresAt: Date;
  used: boolean;
  createdAt: Date;
}

const TokenSchema = new Schema<ITokenDocument>({
  userId: {
    type: String,
    required: true,
    index: true
  },
  type: {
    type: String,
    enum: Object.values(TokenType),
    required: true
  },
  value: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  expiresAt: {
    type: Date,
    required: true,
    index: { expireAfterSeconds: 0 }
  },
  used: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Compound indexes
TokenSchema.index({ userId: 1, type: 1 });
TokenSchema.index({ value: 1, used: 1 });

export const TokenModel = mongoose.model<ITokenDocument>('Token', TokenSchema);