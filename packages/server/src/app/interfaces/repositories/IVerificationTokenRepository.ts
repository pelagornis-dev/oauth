import { VerificationToken } from '../../../domain/entities/VerificationToken';

export interface IVerificationTokenRepository {
  findByToken(token: string): Promise<VerificationToken | null>;
  findByUserId(userId: string): Promise<VerificationToken | null>;
  save(verificationToken: VerificationToken): Promise<VerificationToken>;
  update(verificationToken: VerificationToken): Promise<VerificationToken>;
  delete(id: string): Promise<void>;
  deleteByUserId(userId: string): Promise<void>;
  deleteExpired(): Promise<void>;
}