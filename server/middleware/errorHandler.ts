import { Request, Response, NextFunction } from 'express';

interface ApiError extends Error {
  statusCode?: number;
  code?: string;
}

export const errorHandler = (err: ApiError, req: Request, res: Response, next: NextFunction) => {
  // Log the error for debugging
  console.error('API Error:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    timestamp: new Date().toISOString()
  });

  // Default error response
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';

  // Handle specific error types
  if (err.code === 'ECONNREFUSED') {
    statusCode = 503;
    message = 'Service temporarily unavailable';
  }

  if (err.code === '23505') { // PostgreSQL unique constraint violation
    statusCode = 409;
    message = 'Resource already exists';
  }

  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Invalid request data';
  }

  if (err.name === 'UnauthorizedError') {
    statusCode = 401;
    message = 'Authentication required';
  }

  // OAuth specific errors
  if (err.message.includes('oauth') || err.message.includes('token')) {
    statusCode = 401;
    message = 'OAuth authentication failed';
  }

  // Platform connection errors
  if (err.message.includes('connection') || err.message.includes('platform')) {
    statusCode = 502;
    message = 'Platform connection error';
  }

  // Send structured error response
  res.status(statusCode).json({
    error: {
      message,
      code: err.code || 'UNKNOWN_ERROR',
      statusCode,
      timestamp: new Date().toISOString(),
      path: req.url
    }
  });
};

export const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};