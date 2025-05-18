import * as passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import { Strategy as JwtStrategy, ExtractJwt } from 'passport-jwt';
import { Strategy as ClientPasswordStrategy } from 'passport-oauth2-client-password';
import { AuthUseCase } from '../../domain/usecases/AuthUseCase';
import { User } from '../../domain/entities/User';

export class PassportConfig {
  constructor(private authUseCase: AuthUseCase) {
    this.init();
  }

  init(): void {
    // 로컬 전략 설정 (사용자명/비밀번호)
    passport.use(new LocalStrategy(
      {
        usernameField: 'username',
        passwordField: 'password'
      },
      async (username, password, done) => {
        try {
          const user = await this.authUseCase.authenticateUser(username, password);
          if (!user) {
            return done(null, false, { message: 'Invalid credentials' });
          }
          return done(null, user);
        } catch (error) {
          return done(error);
        }
      }
    ));

    // JWT 전략 설정
    passport.use(new JwtStrategy(
      {
        jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
        secretOrKey: process.env.JWT_SECRET
      },
      async (payload, done) => {
        try {
          const user = await this.authUseCase.userRepository.findById(payload.userId);
          if (!user) {
            return done(null, false);
          }
          return done(null, user);
        } catch (error) {
          return done(error);
        }
      }
    ));

    // OAuth 클라이언트 비밀번호 전략 설정
    passport.use(new ClientPasswordStrategy(
      async (clientId, clientSecret, done) => {
        try {
          const client = await this.authUseCase.validateClient(clientId, clientSecret);
          if (!client) {
            return done(null, false);
          }
          return done(null, client);
        } catch (error) {
          return done(error);
        }
      }
    ));

    // 세션 직렬화/역직렬화 설정
    passport.serializeUser((user: User, done) => {
      done(null, user.id);
    });

    passport.deserializeUser(async (id: string, done) => {
      try {
        const user = await this.authUseCase.userRepository.findById(id);
        done(null, user);
      } catch (error) {
        done(error);
      }
    });
  }
}