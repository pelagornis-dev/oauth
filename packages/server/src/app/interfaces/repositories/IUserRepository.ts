import { User } from '../../../domain/entities/User';
import { Email } from '../../../domain/value-objects/Email';

export interface IUserRepository {
  findById(id: string): Promise<User | null>;
  findByEmail(email: Email): Promise<User | null>;
  findByProviderInfo(provider: string, providerId: string): Promise<User | null>;
  save(user: User): Promise<User>;
  update(user: User): Promise<User>;
  delete(id: string): Promise<void>;
  exists(email: Email): Promise<boolean>;
}
