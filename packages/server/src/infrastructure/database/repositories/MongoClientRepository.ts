import { ClientModel } from '../models/ClientModel';
import { Client, GrantType } from '../../../domain/entities/Client';
import { ClientRepository, ClientData } from '../../../domain/repositories/ClientRepository';

export class MongoClientRepository implements ClientRepository {
  async findById(id: string): Promise<Client | null> {
    const client = await ClientModel.findById(id);
    if (!client) return null;
    
    return new Client(
      client._id.toString(),
      client.name,
      client.clientId,
      client.clientSecret,
      client.redirectUris,
      client.grants as GrantType[]
    );
  }

  async findByClientId(clientId: string): Promise<Client | null> {
    const client = await ClientModel.findOne({ clientId });
    if (!client) return null;
    
    return new Client(
      client._id.toString(),
      client.name,
      client.clientId,
      client.clientSecret,
      client.redirectUris,
      client.grants as GrantType[]
    );
  }

  async create(clientData: ClientData): Promise<Client> {
    const client = new ClientModel({
      name: clientData.name,
      clientId: clientData.clientId,
      clientSecret: clientData.clientSecret,
      redirectUris: clientData.redirectUris,
      grants: clientData.grants
    });
    
    await client.save();
    
    return new Client(
      client._id.toString(),
      client.name,
      client.clientId,
      client.clientSecret,
      client.redirectUris,
      client.grants as GrantType[]
    );
  }

  async getAll(): Promise<Client[]> {
    const clients = await ClientModel.find();
    
    return clients.map(client => new Client(
      client._id.toString(),
      client.name,
      client.clientId,
      client.clientSecret,
      client.redirectUris,
      client.grants as GrantType[]
    ));
  }
}