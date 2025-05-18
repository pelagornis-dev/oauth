import { UserModel } from '../models/UserModel';
import { User, UserRole } from '../../../domain/entities/User';
import { UserRepository, UserData } from '../../../domain/repositories/UserRepository';

export class MongoUserRepository implements UserRepository {
  async findById(id: string): Promise<User | null> {
    const user = await UserModel.findById(id);
    if (!user) return null;
    
    return new User(
      user._id.toString(),
      user.username,
      user.email,
      user.password,
      user.role as UserRole
    );
  }

  async findByUsername(username: string): Promise<User | null> {
    const user = await UserModel.findOne({ username });
    if (!user) return null;
    
    return new User(
      user._id.toString(),
      user.username,
      user.email,
      user.password,
      user.role as UserRole
    );
  }

  async findByEmail(email: string): Promise<User | null> {
    const user = await UserModel.findOne({ email });
    if (!user) return null;
    
    return new User(
      user._id.toString(),
      user.username,
      user.email,
      user.password,
      user.role as UserRole
    );
  }

  async create(userData: UserData): Promise<User> {
    const user = new UserModel({
      username: userData.username,
      email: userData.email,
      password: userData.password,
      role: userData.role || UserRole.USER
    });
    
    await user.save();
    
    return new User(
      user._id.toString(),
      user.username,
      user.email,
      user.password,
      user.role as UserRole
    );
  }

  async update(id: string, userData: Partial<UserData>): Promise<User | null> {
    const user = await UserModel.findByIdAndUpdate(
      id,
      { 
        ...userData,
        updatedAt: new Date() 
      },
      { new: true }
    );
    
    if (!user) return null;
    
    return new User(
      user._id.toString(),
      user.username,
      user.email,
      user.password,
      user.role as UserRole
    );
  }
}