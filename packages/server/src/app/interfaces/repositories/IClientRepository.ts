import { Client } from '../../../domain/entities/Client';

export interface IClientRepository {
  findById(id: string): Promise<Client | null>;
  findByIdAndSecret(id: string, secret: string): Promise<Client | null>;
  save(client: Client): Promise<Client>;
  update(client: Client): Promise<Client>;
  delete(id: string): Promise<void>;
  findAll(): Promise<Client[]>;
}