import type { Express } from "express";
import { storage } from "./storage";
import { authGuard } from './middleware/authGuard';

export async function registerRoutes(app: Express) {
  // Health check
  app.get('/api/health', async (req, res) => {
    res.json({ status: 'healthy' });
  });

  // User endpoint  
  app.get('/api/user', authGuard, async (req: any, res) => {
    try {
      const user = await storage.getUserById(req.session.userId);
      res.json(user);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get user' });
    }
  });

  // User status endpoint
  app.get('/api/user-status', authGuard, async (req: any, res) => {
    try {
      const user = await storage.getUserById(req.session.userId);
      res.json({ 
        authenticated: true, 
        user: user,
        hasActiveSubscription: true 
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to get user status' });
    }
  });
}

export function addNotificationEndpoints(app: Express) {
  // Notification placeholder
  app.post('/api/notifications/send', (req, res) => {
    res.json({ success: true });
  });
}