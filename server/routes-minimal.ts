import type { Express } from "express";
import { createServer, type Server } from "http";

export async function registerRoutes(app: Express): Promise<Server> {
  // Basic health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  const httpServer = createServer(app);
  return httpServer;
}

export function addNotificationEndpoints(app: any) {
  // Minimal notification endpoint
  app.post('/api/notifications', (req, res) => {
    res.json({ success: true });
  });
}