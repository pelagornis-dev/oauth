import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { MongoUserRepository } from '../../../../infrastructure/database/repositories/MongoUserRepository';
import { UserModel } from '../../../../infrastructure/database/models/UserModel';
import { User, UserRole } from '../../../../domain/entities/User';
import mongoose from 'mongoose';

// 몽구스 모델 모킹
vi.mock('../../../../infrastructure/database/models/UserModel', () => {
  return {
    UserModel: {
      findById: vi.fn(),
      findOne: vi.fn(),
      prototype: {
        save: vi.fn()
      }
    }
  };
});

describe('MongoUserRepository', () => {
  let repository: MongoUserRepository;
  
  beforeEach(() => {
    // 테스트 전에 모든 모킹 초기화
    vi.clearAllMocks();
    
    // 몽구스 인스턴스 메서드 모킹
    UserModel.prototype.save = vi.fn().mockResolvedValue({
      _id: new mongoose.Types.ObjectId('60d21b4667d0d8992e610c85'),
      username: 'testuser',
      email: 'test@example.com',
      password: 'hashedpassword',
      role: UserRole.USER,
      toObject: () => ({
        _id: '60d21b4667d0d8992e610c85',
        username: 'testuser',
        email: 'test@example.com',
        password: 'hashedpassword',
        role: UserRole.USER
      })
    });

    repository = new MongoUserRepository();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('findById', () => {
    it('should return null when user is not found', async () => {
      // UserModel.findById 메서드가 null을 반환하도록 모킹
      vi.mocked(UserModel.findById).mockResolvedValue(null);

      const result = await repository.findById('nonexistent-id');

      expect(result).toBeNull();
      expect(UserModel.findById).toHaveBeenCalledWith('nonexistent-id');
    });

    it('should return user when user is found', async () => {
      // 몽고DB 결과 객체 모킹
      const userDocument = {
        _id: new mongoose.Types.ObjectId('60d21b4667d0d8992e610c85'),
        username: 'testuser',
        email: 'test@example.com',
        password: 'hashedpassword',
        role: 'user',
        toObject: () => ({
          _id: '60d21b4667d0d8992e610c85',
          username: 'testuser',
          email: 'test@example.com',
          password: 'hashedpassword',
          role: 'user'
        })
      };

      vi.mocked(UserModel.findById).mockResolvedValue(userDocument);

      const result = await repository.findById('60d21b4667d0d8992e610c85');

      expect(result).not.toBeNull();
      expect(result).toBeInstanceOf(User);
      expect(result?.id).toBe('60d21b4667d0d8992e610c85');
      expect(result?.username).toBe('testuser');
      expect(result?.email).toBe('test@example.com');
      expect(result?.password).toBe('hashedpassword');
      expect(result?.role).toBe(UserRole.USER);
      expect(UserModel.findById).toHaveBeenCalledWith('60d21b4667d0d8992e610c85');
    });
  });

  describe('findByUsername', () => {
    it('should return null when user is not found', async () => {
      vi.mocked(UserModel.findOne).mockResolvedValue(null);

      const result = await repository.findByUsername('nonexistent-user');

      expect(result).toBeNull();
      expect(UserModel.findOne).toHaveBeenCalledWith({ username: 'nonexistent-user' });
    });

    it('should return user when user is found', async () => {
      const userDocument = {
        _id: new mongoose.Types.ObjectId('60d21b4667d0d8992e610c85'),
        username: 'testuser',
        email: 'test@example.com',
        password: 'hashedpassword',
        role: 'user',
        toObject: () => ({
          _id: '60d21b4667d0d8992e610c85',
          username: 'testuser',
          email: 'test@example.com',
          password: 'hashedpassword',
          role: 'user'
        })
      };

      vi.mocked(UserModel.findOne).mockResolvedValue(userDocument);

      const result = await repository.findByUsername('testuser');

      expect(result).not.toBeNull();
      expect(result).toBeInstanceOf(User);
      expect(result?.id).toBe('60d21b4667d0d8992e610c85');
      expect(result?.username).toBe('testuser');
      expect(UserModel.findOne).toHaveBeenCalledWith({ username: 'testuser' });
    });
  });

  describe('create', () => {
    it('should create and return a new user', async () => {
      // 새 UserModel 인스턴스를 반환하는 생성자 모킹
      vi.spyOn(UserModel.prototype, 'save').mockResolvedValue({
        _id: new mongoose.Types.ObjectId('60d21b4667d0d8992e610c85'),
        username: 'newuser',
        email: 'new@example.com',
        password: 'hashedpassword',
        role: UserRole.USER,
        toObject: () => ({
          _id: '60d21b4667d0d8992e610c85',
          username: 'newuser',
          email: 'new@example.com',
          password: 'hashedpassword',
          role: UserRole.USER
        })
      });

      const userData = {
        username: 'newuser',
        email: 'new@example.com',
        password: 'password',
        role: UserRole.USER
      };

      // UserModel 생성자 모킹
      const originalUserModel = global.UserModel;
      // @ts-ignore - 테스트를 위한 모킹
      global.UserModel = function(data: any) {
        this._id = new mongoose.Types.ObjectId('60d21b4667d0d8992e610c85');
        this.username = data.username;
        this.email = data.email;
        this.password = data.password;
        this.role = data.role;
        this.save = vi.fn().mockResolvedValue(this);
      };

      const result = await repository.create(userData);

      expect(result).toBeInstanceOf(User);
      expect(result.id).toBe('60d21b4667d0d8992e610c85');
      expect(result.username).toBe('newuser');
      expect(result.email).toBe('new@example.com');

      // 모킹 복원
      global.UserModel = originalUserModel;
    });
  });
});