import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IVerificationTokenDocument extends Document {
  _id: Types.ObjectId;
  userId: string;
  email: string;
  token: string;
  expiresAt: Date;
  verified: boolean;
  createdAt: Date;
}

const VerificationTokenSchema = new Schema<IVerificationTokenDocument>({
  userId: {
    type: String,
    required: true,
    index: true
  },
  email: {
    type: String,
    required: true,
    lowercase: true
  },
  token: {
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
  verified: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

export const VerificationTokenModel = mongoose.model<IVerificationTokenDocument>('VerificationToken', VerificationTokenSchema);