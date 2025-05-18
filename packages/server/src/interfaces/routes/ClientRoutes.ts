import { Router } from 'express';
import { ClientController } from '../controllers/ClientController';
import { AuthMiddleware } from '../middlewares/AuthMiddleware';
import { UserRole } from '../../domain/entities/User';

export class ClientRoutes {
  private router: Router;
  
  constructor(
    private clientController: ClientController,
    private authMiddleware: AuthMiddleware
  ) {
    this.router = Router();
    this.initRoutes();
  }

  private initRoutes(): void {
    // 클라이언트 생성 (관리자만 가능)
    this.router.post(
      '/',
      this.authMiddleware.authenticate,
      this.authMiddleware.requireRole(UserRole.ADMIN),
      this.clientController.createClient
    );
    
    // 클라이언트 조회 (관리자만 가능)
    this.router.get(
      '/:id',
      this.authMiddleware.authenticate,
      this.authMiddleware.requireRole(UserRole.ADMIN),
      this.clientController.getClient
    );
    
    // 모든 클라이언트 조회 (관리자만 가능)
    this.router.get(
      '/',
      this.authMiddleware.authenticate,
      this.authMiddleware.requireRole(UserRole.ADMIN),
      this.clientController.getAllClients
    );
  }

  getRouter(): Router {
    return this.router;
  }
}