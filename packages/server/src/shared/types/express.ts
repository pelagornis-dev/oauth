import { Request } from 'express';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        firstName: string;
        lastName: string;
        provider: string;
        emailVerified: boolean;
        roles?: string[];
        permissions?: string[];
      };
      locale: string;
      requestId?: string;
      startTime?: number;
    }
  }
}

export interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    provider: string;
    emailVerified: boolean;
    roles?: string[];
    permissions?: string[];
  };
}

export interface PaginationQuery {
  page?: string;
  limit?: string;
  sort?: string;
  order?: 'asc' | 'desc';
}

export interface SearchQuery extends PaginationQuery {
  q?: string;
  filter?: string;
}