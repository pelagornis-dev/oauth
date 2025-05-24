export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: {
    code: string;
    message: string;
    statusCode: number;
    timestamp: string;
    details?: any;
  };
  meta?: {
    pagination?: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
    timestamp: string;
    requestId?: string;
  };
}

export interface SuccessResponse<T = any> extends ApiResponse<T> {
  success: true;
  data: T;
}

export interface ErrorResponse extends ApiResponse {
  success: false;
  error: {
    code: string;
    message: string;
    statusCode: number;
    timestamp: string;
    details?: any;
  };
}

export interface PaginatedResponse<T = any> extends SuccessResponse<T[]> {
  meta: {
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
    timestamp: string;
    requestId?: string;
  };
}

// Health Check Response
export interface HealthCheckResponse {
  status: 'OK' | 'ERROR';
  timestamp: string;
  uptime: number;
  environment: string;
  version: string;
  services: {
    database: 'healthy' | 'unhealthy';
    memory: {
      rss: string;
      heapTotal: string;
      heapUsed: string;
      external: string;
    };
    cpu: {
      user: number;
      system: number;
    };
  };
}