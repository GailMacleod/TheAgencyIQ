import type { Express } from "express";

export function registerRoutes(app: Express) {
  // Basic health check route
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });
  
  // Basic user route
  app.get('/api/user', (req, res) => {
    res.json({ id: 2, email: 'gailm@macleodglba.com.au' });
  });
}

export function addNotificationEndpoints(app: Express) {
  // Empty for now
}