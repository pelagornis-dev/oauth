import { Password } from '../../../domain/value-objects/Password';

export interface IPasswordService {
  hash(password: Password): Promise<string>;
  compare(password: Password, hashedPassword: string): Promise<boolean>;
  generateRandomPassword(length?: number): Promise<string>;
}