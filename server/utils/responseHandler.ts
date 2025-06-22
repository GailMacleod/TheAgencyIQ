import { Response } from 'express';

export class ResponseHandler {
  static success(res: Response, data: any, message?: string) {
    return res.status(200).json({
      success: true,
      data,
      message: message || 'Operation successful'
    });
  }

  static error(res: Response, message: string, statusCode: number = 500, details?: any) {
    return res.status(statusCode).json({
      success: false,
      message,
      details
    });
  }

  static oauthError(res: Response, platform: string, reason: string) {
    return res.status(400).json({
      success: false,
      message: `${platform} connection failed`,
      error: reason,
      platform: platform.toLowerCase()
    });
  }

  static oauthSuccess(res: Response, platform: string, data: any) {
    return res.status(200).json({
      success: true,
      message: `${platform} connected successfully`,
      platform: platform.toLowerCase(),
      data
    });
  }

  static unauthorized(res: Response, message: string = 'Authentication required') {
    return res.status(401).json({
      success: false,
      message
    });
  }

  static notFound(res: Response, resource: string = 'Resource') {
    return res.status(404).json({
      success: false,
      message: `${resource} not found`
    });
  }

  static badRequest(res: Response, message: string = 'Invalid request') {
    return res.status(400).json({
      success: false,
      message
    });
  }
}