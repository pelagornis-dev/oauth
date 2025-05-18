import { Client, GrantType } from '../entities/Client';

export interface ClientData {
  name: string;
  clientId: string;
  clientSecret: string;
  redirectUris: string[];
  grants: GrantType[];
}

export interface ClientRepository {
  findById(id: string): Promise<Client | null>;
  findByClientId(clientId: string): Promise<Client | null>;
  create(clientData: ClientData): Promise<Client>;
  getAll(): Promise<Client[]>;
}