import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import * as supertest from 'supertest';
import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import * as express from 'express';
import * as bcrypt from 'bcrypt';

dotenv.config();

// app.ts 불러오기 전 모듈 모킹
vi.mock('mongoose', async () => {
  const actual = await vi.importActual('mongoose');
  return {
    ...actual,
    connect: vi.fn().mockResolvedValue(undefined)
  };
});

// 몽고DB 모델 모킹 (실제 DB 연결 없이 테스트 가능)
vi.mock('../../infrastructure/database/models/UserModel', () => {
  return {
    UserModel: {
      findOne: vi.fn()
    }
  };
});

vi.mock('../../infrastructure/database/models/ClientModel', () => {
  return {
    ClientModel: {
      findOne: vi.fn()
    }
  };
});

vi.mock('../../infrastructure/database/models/TokenModel', () => {
  return {
    TokenModel: {
      findOne: vi.fn(),
      create: vi.fn()
    }
  };
});

// 실제 앱 불러오기
import { app } from '../../app';

// bcrypt 모킹
vi.mock('bcrypt', () => {
  return {
    compare: vi.fn().mockImplementation((password, hash) => password === 'correctpassword'),
    hash: vi.fn().mockImplementation(password => `hashed-${password}`),
    genSalt: vi.fn().mockResolvedValue('salt')
  };
});

describe('OAuth Server API - Integration Tests', () => {
  let request: supertest.SuperTest<supertest.Test>;
  
  beforeAll(async () => {
    // 테스트용 서버 설정
    request = supertest(app);
    
    // 환경 변수 설정
    process.env.JWT_SECRET = 'test-secret';
    process.env.SESSION_SECRET = 'test-session-secret';
    
    // 몽고DB 연결 (모킹됨)
    await mongoose.connect('mongodb://localhost:27017/oauth_test');
  });
  
  afterAll(async () => {
    // 연결 종료
    await mongoose.disconnect();
  });
  
  beforeEach(() => {
    // 각 테스트 전에 모킹 초기화
    vi.clearAllMocks();
  });
  
  describe('Root endpoint', () => {
    it('should return a welcome message', async () => {
      const response = await request.get('/');
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message', 'OAuth 2.0 Server API');
    });
  });
  
  describe('Login endpoint', () => {
    it('should authenticate a user with valid credentials', async () => {
      // UserModel.findOne 메서드 모킹
      const mockUser = {
        _id: new mongoose.Types.ObjectId('60d21b4667d0d8992e610c85'),
        username: 'testuser',
        email: 'test@example.com',
        password: 'hashed-password',
        role: 'user'
      };
      
      require('../../infrastructure/database/models/UserModel').UserModel.findOne.mockResolvedValue(mockUser);
      
      // bcrypt.compare 모킹
      vi.mocked(bcrypt.compare).mockResolvedValue(true);
      
      const response = await request
        .post('/api/auth/login')
        .send({
          username: 'testuser',
          password: 'correctpassword'
        });
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('username', 'testuser');
      expect(response.body).toHaveProperty('email', 'test@example.com');
    });
    
    it('should reject a user with invalid credentials', async () => {
      // UserModel.findOne 메서드 모킹
      const mockUser = {
        _id: new mongoose.Types.ObjectId('60d21b4667d0d8992e610c85'),
        username: 'testuser',
        email: 'test@example.com',
        password: 'hashed-password',
        role: 'user'
      };
      
      require('../../infrastructure/database/models/UserModel').UserModel.findOne.mockResolvedValue(mockUser);
      
      // bcrypt.compare 모킹 (실패)
      vi.mocked(bcrypt.compare).mockResolvedValue(false);
      
      const response = await request
        .post('/api/auth/login')
        .send({
          username: 'testuser',
          password: 'wrongpassword'
        });
      
      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error', 'Invalid credentials');
    });
});