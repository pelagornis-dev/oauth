import { Request, Response } from 'express';
import { ClientRepository } from '../../domain/repositories/ClientRepository';
import { GrantType } from '../../domain/entities/Client';
import { v4 as uuidv4 } from 'uuid';

export class ClientController {
  constructor(private clientRepository: ClientRepository) {}

  createClient = async (req: Request, res: Response): Promise<void> => {
    try {
      const { name, redirectUris, grants } = req.body;
      
      // 필수 입력값 확인
      if (!name || !redirectUris || !Array.isArray(redirectUris) || redirectUris.length === 0) {
        res.status(400).json({ error: 'Name and at least one redirect URI are required' });
        return;
      }
      
      // grants 유효성 검사
      const validGrantTypes = Object.values(GrantType);
      const clientGrants = Array.isArray(grants) && grants.length > 0 
        ? grants.filter(grant => validGrantTypes.includes(grant as GrantType))
        : [GrantType.AUTHORIZATION_CODE, GrantType.REFRESH_TOKEN];
      
      if (clientGrants.length === 0) {
        res.status(400).json({ error: 'At least one valid grant type is required' });
        return;
      }
      
      // 클라이언트 ID 및 비밀번호 생성
      const clientId = uuidv4();
      const clientSecret = uuidv4();
      
      // 클라이언트 생성
      const client = await this.clientRepository.create({
        name,
        clientId,
        clientSecret,
        redirectUris,
        grants: clientGrants as GrantType[]
      });
      
      res.status(201).json({
        id: client.id,
        name: client.name,
        clientId: client.clientId,
        clientSecret: client.clientSecret,
        redirectUris: client.redirectUris,
        grants: client.grants
      });
    } catch (error) {
      console.error('Create client error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };

  getClient = async (req: Request, res: Response): Promise<void> => {
    try {
      const clientId = req.params.id;
      
      const client = await this.clientRepository.findById(clientId);
      if (!client) {
        res.status(404).json({ error: 'Client not found' });
        return;
      }
      
      res.json({
        id: client.id,
        name: client.name,
        clientId: client.clientId,
        // 보안을 위해 클라이언트 비밀번호는 제외
        redirectUris: client.redirectUris,
        grants: client.grants
      });
    } catch (error) {
      console.error('Get client error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };

  getAllClients = async (req: Request, res: Response): Promise<void> => {
    try {
      const clients = await this.clientRepository.getAll();
      
      const clientData = clients.map(client => ({
        id: client.id,
        name: client.name,
        clientId: client.clientId,
        // 보안을 위해 클라이언트 비밀번호는 제외
        redirectUris: client.redirectUris,
        grants: client.grants
      }));
      
      res.json(clientData);
    } catch (error) {
      console.error('Get all clients error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };
}