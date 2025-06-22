import { Request, Response, NextFunction } from 'express';

export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal Server Error";

  // Only log actual server errors, not client errors
  if (status >= 500) {
    console.error("Server error:", err.stack || err.message);
  }

  if (!res.headersSent) {
    res.status(status).json({ message });
  }
};