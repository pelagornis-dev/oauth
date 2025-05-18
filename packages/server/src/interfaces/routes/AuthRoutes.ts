import { Router } from 'express';
import { AuthController } from '../controllers/AuthController';
import { AuthMiddleware } from '../middlewares/AuthMiddleware';
import * as passport from 'passport';

export class AuthRoutes {
  private router: Router;
  
  constructor(
    private authController: AuthController,
    private authMiddleware: AuthMiddleware
  ) {
    this.router = Router();
    this.initRoutes();
  }

  private initRoutes(): void {
    // 로그인 라우트
    this.router.post('/login', passport.authenticate('local', { session: false }), this.authController.login);
    
    // OAuth 인증 라우트
    this.router.get('/authorize', this.authMiddleware.authenticate, this.authController.authorize);
    
    // 토큰 발급 라우트
    this.router.post('/token', this.authController.token);
  }

  getRouter(): Router {
    return this.router;
  }
}