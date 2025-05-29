import mongoose, { Schema, Document, Types } from 'mongoose';
import { UserStatus } from '../../../../domain/enums/UserStatus';
import { AuthProvider } from '../../../../domain/enums/AuthProvider';

export interface IUserDocument extends Document {
  _id: Types.ObjectId;
  email: string;
  password?: string;
  firstName: string;
  lastName: string;
  status: UserStatus;
  provider: AuthProvider;
  providerId?: string;
  emailVerified: boolean;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUserDocument>({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    index: true
  },
  password: {
    type: String,
    required: function(this: IUserDocument) {
      return this.provider === AuthProvider.LOCAL;
    }
  },
  firstName: {
    type: String,
    required: true,
    trim: true
  },
  lastName: {
    type: String,
    required: true,
    trim: true
  },
  status: {
    type: String,
    enum: Object.values(UserStatus),
    default: UserStatus.PENDING
  },
  provider: {
    type: String,
    enum: Object.values(AuthProvider),
    default: AuthProvider.LOCAL
  },
  providerId: {
    type: String,
    sparse: true,
    index: true
  },
  emailVerified: {
    type: Boolean,
    default: false
  },
  lastLoginAt: {
    type: Date
  }
}, {
  timestamps: true,
  toJSON: {
    transform: (doc, ret) => {
      delete ret.password;
      return ret;
    }
  }
});

// Compound indexes
UserSchema.index({ provider: 1, providerId: 1 }, { unique: true, sparse: true });
UserSchema.index({ email: 1, provider: 1 });

export const UserModel = mongoose.model<IUserDocument>('User', UserSchema);
