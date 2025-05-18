import { Router } from 'express';
import { UserController } from '../controllers/UserController';
import { AuthMiddleware } from '../middlewares/AuthMiddleware';
import { UserRole } from '../../domain/entities/User';

export class UserRoutes {
  private router: Router;
  
  constructor(
    private userController: UserController,
    private authMiddleware: AuthMiddleware
  ) {
    this.router = Router();
    this.initRoutes();
  }

  private initRoutes(): void {
    // 사용자 생성 (관리자만 가능)
    this.router.post(
      '/',
      this.authMiddleware.authenticate,
      this.authMiddleware.requireRole(UserRole.ADMIN),
      this.userController.createUser
    );
    
    // 사용자 조회 (관리자만 가능)
    this.router.get(
      '/:id',
      this.authMiddleware.authenticate,
      this.authMiddleware.requireRole(UserRole.ADMIN),
      this.userController.getUser
    );
    
    // 현재 로그인된 사용자 정보 조회
    this.router.get(
      '/me',
      this.authMiddleware.authenticate,
      this.userController.getCurrentUser
    );
  }

  getRouter(): Router {
    return this.router;
  }
}