import { IClientRepository } from '../../../../app/interfaces/repositories/IClientRepository';
import { Client } from '../../../../domain/entities/Client';
import { ClientModel, IClientDocument } from '../models/ClientModel';
import { logger } from '../../../../shared/utils/logger';
import { BaseError } from '../../../../shared/errors/BaseError';
import { HTTP_STATUS } from '../../../../shared/constants/httpStatus';
import { ValidationUtils } from '../../../../shared/utils/validation';

class ClientRepositoryError extends BaseError {
  constructor(message: string, operation: string, originalError?: Error) {
    super(message, HTTP_STATUS.INTERNAL_SERVER_ERROR, false, {
      operation,
      originalError: originalError?.message
    });
  }
}

export class MongoClientRepository implements IClientRepository {
  private readonly logger = logger.setContext({ repository: 'MongoClientRepository' });

  async findById(id: string): Promise<Client | null> {
    try {
      if (!ValidationUtils.isValidObjectId(id)) {
        this.logger.warn('Invalid ObjectId provided', { id });
        return null;
      }

      this.logger.debug('Finding client by ID', { clientId: id });
      const clientDoc = await ClientModel.findById(id);
      
      if (clientDoc) {
        this.logger.debug('Client found by ID', { clientId: id });
        return this.mapToEntity(clientDoc);
      }
      
      this.logger.debug('Client not found by ID', { clientId: id });
      return null;
    } catch (error) {
      this.logger.error('Error finding client by ID', { clientId: id, error });
      throw new ClientRepositoryError(
        `Failed to find client by ID: ${id}`,
        'findById',
        error instanceof Error ? error : undefined
      );
    }
  }

  async findByIdAndSecret(id: string, secret: string): Promise<Client | null> {
    try {
      if (!ValidationUtils.isValidObjectId(id)) {
        this.logger.warn('Invalid ObjectId provided', { id });
        return null;
      }

      this.logger.debug('Finding client by ID and secret', { clientId: id });
      const clientDoc = await ClientModel.findOne({ _id: id, secret });
      
      if (clientDoc) {
        this.logger.debug('Client found by ID and secret', { clientId: id });
        return this.mapToEntity(clientDoc);
      }
      
      this.logger.debug('Client not found by ID and secret', { clientId: id });
      return null;
    } catch (error) {
      this.logger.error('Error finding client by ID and secret', { clientId: id, error });
      throw new ClientRepositoryError(
        `Failed to find client by ID and secret`,
        'findByIdAndSecret',
        error instanceof Error ? error : undefined
      );
    }
  }

  async save(client: Client): Promise<Client> {
    try {
      this.logger.info('Saving new client', { 
        clientId: client.getId(),
        name: client.getName()
      });

      const clientDoc = new ClientModel({
        _id: client.getId(),
        name: client.getName(),
        secret: client.getSecret(),
        redirectUris: client.getRedirectUris(),
        grants: client.getGrants(),
        scopes: client.getScopes(),
        trusted: client.isTrusted(),
        createdAt: client.getCreatedAt(),
        updatedAt: client.getUpdatedAt()
      });

      const savedDoc = await clientDoc.save();
      
      this.logger.info('Client saved successfully', { clientId: savedDoc._id });
      return this.mapToEntity(savedDoc);
    } catch (error) {
      this.logger.error('Error saving client', { 
        clientId: client.getId(),
        name: client.getName(),
        error 
      });

      throw new ClientRepositoryError(
        `Failed to save client`,
        'save',
        error instanceof Error ? error : undefined
      );
    }
  }

  async update(client: Client): Promise<Client> {
    try {
      this.logger.info('Updating client', { clientId: client.getId() });

      const updatedDoc = await ClientModel.findByIdAndUpdate(
        client.getId(),
        {
          name: client.getName(),
          secret: client.getSecret(),
          redirectUris: client.getRedirectUris(),
          grants: client.getGrants(),
          scopes: client.getScopes(),
          trusted: client.isTrusted(),
          updatedAt: client.getUpdatedAt()
        },
        { new: true }
      );

      if (!updatedDoc) {
        this.logger.warn('Client not found for update', { clientId: client.getId() });
        throw new ClientRepositoryError(
          `Client with id ${client.getId()} not found for update`,
          'update'
        );
      }

      this.logger.info('Client updated successfully', { clientId: updatedDoc._id });
      return this.mapToEntity(updatedDoc);
    } catch (error) {
      this.logger.error('Error updating client', { clientId: client.getId(), error });
      throw new ClientRepositoryError(
        `Failed to update client`,
        'update',
        error instanceof Error ? error : undefined
      );
    }
  }

  async delete(id: string): Promise<void> {
    try {
      if (!ValidationUtils.isValidObjectId(id)) {
        throw new ClientRepositoryError('Invalid client ID format', 'delete');
      }

      this.logger.info('Deleting client', { clientId: id });
      
      const result = await ClientModel.findByIdAndDelete(id);
      
      if (!result) {
        this.logger.warn('Client not found for deletion', { clientId: id });
        throw new ClientRepositoryError(`Client with id ${id} not found for deletion`, 'delete');
      }

      this.logger.info('Client deleted successfully', { clientId: id });
    } catch (error) {
      this.logger.error('Error deleting client', { clientId: id, error });
      if (error instanceof ClientRepositoryError) {
        throw error;
      }
      throw new ClientRepositoryError(
        `Failed to delete client`,
        'delete',
        error instanceof Error ? error : undefined
      );
    }
  }

  async findAll(): Promise<Client[]> {
    try {
      this.logger.debug('Finding all clients');
      
      const clientDocs = await ClientModel.find();
      const clients = clientDocs.map(doc => this.mapToEntity(doc));
      
      this.logger.debug('Clients found', { count: clients.length });
      return clients;
    } catch (error) {
      this.logger.error('Error finding all clients', { error });
      throw new ClientRepositoryError(
        `Failed to find all clients`,
        'findAll',
        error instanceof Error ? error : undefined
      );
    }
  }

  private mapToEntity(doc: IClientDocument): Client {
    try {
      const client = new Client(
        doc._id.toString(),
        doc.name,
        doc.secret,
        doc.redirectUris,
        doc.grants,
        doc.scopes
      );

      // Set additional properties
      (client as any).trusted = doc.trusted;
      (client as any).createdAt = doc.createdAt;
      (client as any).updatedAt = doc.updatedAt;

      return client;
    } catch (error) {
      this.logger.error('Error mapping client document to entity', { docId: doc._id, error });
      throw new ClientRepositoryError(
        'Failed to map client document to entity',
        'mapToEntity',
        error instanceof Error ? error : undefined
      );
    }
  }
}