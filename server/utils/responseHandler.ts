import { Response } from 'express';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code?: string;
    statusCode?: number;
  };
  timestamp: string;
}

export class ResponseHandler {
  static success<T>(res: Response, data: T, statusCode = 200): void {
    const response: ApiResponse<T> = {
      success: true,
      data,
      timestamp: new Date().toISOString()
    };
    res.status(statusCode).json(response);
  }

  static error(res: Response, message: string, statusCode = 500, code?: string): void {
    const response: ApiResponse = {
      success: false,
      error: {
        message,
        code: code || 'UNKNOWN_ERROR',
        statusCode
      },
      timestamp: new Date().toISOString()
    };
    res.status(statusCode).json(response);
  }

  static unauthorized(res: Response, message = 'Unauthorized'): void {
    this.error(res, message, 401, 'UNAUTHORIZED');
  }

  static notFound(res: Response, message = 'Resource not found'): void {
    this.error(res, message, 404, 'NOT_FOUND');
  }

  static validation(res: Response, message = 'Validation failed'): void {
    this.error(res, message, 400, 'VALIDATION_ERROR');
  }

  static platformError(res: Response, platform: string, message = 'Platform connection failed'): void {
    this.error(res, `${platform}: ${message}`, 502, 'PLATFORM_ERROR');
  }

  static oauthError(res: Response, platform: string, message = 'OAuth authentication failed'): void {
    this.error(res, `${platform} OAuth: ${message}`, 401, 'OAUTH_ERROR');
  }
}