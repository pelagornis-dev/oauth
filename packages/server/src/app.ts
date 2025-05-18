import * as express from 'express';
import * as mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import * as passport from 'passport';
import * as session from 'express-session';

// 도메인 레이어
import { AuthUseCase } from './domain/usecases/AuthUseCase';

// 인프라 레이어
import { MongoUserRepository } from './infrastructure/database/repositories/MongoUserRepository';
import { MongoClientRepository } from './infrastructure/database/repositories/MongoClientRepository';
import { MongoTokenRepository } from './infrastructure/database/repositories/MongoTokenRepository';
import { PassportConfig } from './infrastructure/auth/PassportConfig';

// 인터페이스 레이어
import { AuthController } from './interfaces/controllers/AuthController';
import { UserController } from './interfaces/controllers/UserController';
import { ClientController } from './interfaces/controllers/ClientController';
import { AuthMiddleware } from './interfaces/middlewares/AuthMiddleware';
import { AuthRoutes } from './interfaces/routes/AuthRoutes';
import { UserRoutes } from './interfaces/routes/UserRoutes';
import { ClientRoutes } from './interfaces/routes/ClientRoutes';

// 환경 변수 설정
dotenv.config();

class App {
  public app: express.Application;
  
  constructor() {
    this.app = express();
    this.configMiddlewares();
    this.connectToDatabase();
    this.initializeRepositories();
    this.initializeUseCases();
    this.initializePassport();
    this.initializeControllers();
    this.initializeMiddlewares();
    this.initializeRoutes();
  }

  private configMiddlewares(): void {
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));
    this.app.use(session({
      secret: process.env.SESSION_SECRET,
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: process.env.NODE_ENV === 'production',
        maxAge: 24 * 60 * 60 * 1000 // 1일
      }
    }));
    this.app.use(passport.initialize());
    this.app.use(passport.session());
  }

  private connectToDatabase(): void {
    mongoose.connect(process.env.MONGODB_URI)
      .then(() => {
        console.log('Connected to MongoDB');
      })
      .catch(error => {
        console.error('MongoDB connection error:', error);
        process.exit(1);
      });
  }

  private userRepository!: MongoUserRepository;
  private clientRepository!: MongoClientRepository;
  private tokenRepository!: MongoTokenRepository;
  private authUseCase!: AuthUseCase;
  private passportConfig!: PassportConfig;
  private authController!: AuthController;
  private userController!: UserController;
  private clientController!: ClientController;
  private authMiddleware!: AuthMiddleware;
  private authRoutes!: AuthRoutes;
  private userRoutes!: UserRoutes;
  private clientRoutes!: ClientRoutes;

  private initializeRepositories(): void {
    this.userRepository = new MongoUserRepository();
    this.clientRepository = new MongoClientRepository();
    this.tokenRepository = new MongoTokenRepository();
  }

  private initializeUseCases(): void {
    this.authUseCase = new AuthUseCase(
      this.userRepository,
      this.tokenRepository,
      this.clientRepository
    );
  }

  private initializePassport(): void {
    this.passportConfig = new PassportConfig(this.authUseCase);
  }

  private initializeControllers(): void {
    this.authController = new AuthController(this.authUseCase);
    this.userController = new UserController(this.userRepository);
    this.clientController = new ClientController(this.clientRepository);
  }

  private initializeMiddlewares(): void {
    this.authMiddleware = new AuthMiddleware();
  }

  private initializeRoutes(): void {
    this.authRoutes = new AuthRoutes(this.authController, this.authMiddleware);
    this.userRoutes = new UserRoutes(this.userController, this.authMiddleware);
    this.clientRoutes = new ClientRoutes(this.clientController, this.authMiddleware);

    this.app.use('/api/auth', this.authRoutes.getRouter());
    this.app.use('/api/users', this.userRoutes.getRouter());
    this.app.use('/api/clients', this.clientRoutes.getRouter());

    // 기본 라우트
    this.app.get('/', (req: express.Request, res: express.Response) => {
      res.json({ message: 'OAuth 2.0 Server API' });
    });

    // 에러 핸들링 미들웨어
    this.app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
      console.error('Error:', err);
      res.status(500).json({ error: 'Internal server error' });
    });

    // 404 에러 핸들링
    this.app.use((req: express.Request, res: express.Response) => {
      res.status(404).json({ error: 'Not found' });
    });
  }

  public start(): void {
    const port = process.env.PORT || 3000;
    this.app.listen(port, () => {
      console.log(`Server running on port ${port}`);
    });
  }
}

// 애플리케이션 시작
const app = new App();
app.start();