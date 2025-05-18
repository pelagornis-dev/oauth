import { User } from '../entities/User';

export interface UserData {
  username: string;
  email: string;
  password: string;
  role?: string;
}

export interface UserRepository {
  findById(id: string): Promise<User | null>;
  findByUsername(username: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  create(userData: UserData): Promise<User>;
  update(id: string, userData: Partial<UserData>): Promise<User | null>;
}