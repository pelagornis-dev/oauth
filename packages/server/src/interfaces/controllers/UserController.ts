import { Request, Response } from 'express';
import { UserRepository } from '../../domain/repositories/UserRepository';
import { UserRole } from '../../domain/entities/User';

export class UserController {
  constructor(private userRepository: UserRepository) {}

  createUser = async (req: Request, res: Response): Promise<void> => {
    try {
      const { username, email, password, role } = req.body;
      
      // 필수 입력값 확인
      if (!username || !email || !password) {
        res.status(400).json({ error: 'Username, email, and password are required' });
        return;
      }
      
      // 이메일 중복 확인
      const existingUserEmail = await this.userRepository.findByEmail(email);
      if (existingUserEmail) {
        res.status(409).json({ error: 'Email already exists' });
        return;
      }
      
      // 사용자명 중복 확인
      const existingUserName = await this.userRepository.findByUsername(username);
      if (existingUserName) {
        res.status(409).json({ error: 'Username already exists' });
        return;
      }
      
      // 사용자 생성
      const user = await this.userRepository.create({
        username,
        email,
        password,
        role: role || UserRole.USER
      });
      
      res.status(201).json({
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role
      });
    } catch (error) {
      console.error('Create user error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };

  getUser = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.params.id;
      
      const user = await this.userRepository.findById(userId);
      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }
      
      res.json({
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role
      });
    } catch (error) {
      console.error('Get user error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };
  
  getCurrentUser = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }
      
      res.json({
        id: req.user.id,
        username: req.user.username,
        email: req.user.email,
        role: req.user.role
      });
    } catch (error) {
      console.error('Get current user error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };
}