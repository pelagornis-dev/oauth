// src/infrastructure/database/models/UserModel.ts
import * as mongoose from 'mongoose';
import * as bcrypt from 'bcrypt';
import { UserRole } from '../../../domain/entities/User';

export interface IUserDocument extends mongoose.Document {
  username: string;
  email: string;
  password: string;
  role: string;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { 
    type: String, 
    enum: Object.values(UserRole), 
    default: UserRole.USER 
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// 비밀번호 해싱 미들웨어
userSchema.pre<IUserDocument>('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error instanceof Error ? error : new Error('Password hashing error'));
  }
});

export const UserModel = mongoose.model<IUserDocument>('User', userSchema);
