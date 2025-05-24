import { Token } from '../../../domain/entities/Token';
import { TokenType } from '../../../domain/enums/TokenType';

export interface ITokenRepository {
  findById(id: string): Promise<Token | null>;
  findByValue(value: string): Promise<Token | null>;
  findByUserIdAndType(userId: string, type: TokenType): Promise<Token[]>;
  save(token: Token): Promise<Token>;
  update(token: Token): Promise<Token>;
  delete(id: string): Promise<void>;
  deleteExpired(): Promise<void>;
  deleteByUserId(userId: string, type?: TokenType): Promise<void>;
}