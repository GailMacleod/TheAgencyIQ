import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupOAuthBlueprint } from "./oauth-blueprint";

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Setup OAuth Blueprint - Phone-based connections
  setupOAuthBlueprint(app);

  // Basic health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  const httpServer = createServer(app);
  return httpServer;
}