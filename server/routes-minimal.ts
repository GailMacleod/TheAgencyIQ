import type { Express, Request, Response, NextFunction } from "express";
import express from "express";
import { createServer, type Server } from "http";

// Minimal routes.ts to get React working
// This removes all problematic imports and dependencies

export async function registerRoutes(app: Express): Promise<Server> {
  // Basic health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
  });

  // Basic user endpoint
  app.get('/api/user', (req, res) => {
    res.json({ 
      id: 2, 
      email: 'gailm@macleodglba.com.au',
      name: 'Gail MacLeod',
      hasActiveSubscription: true
    });
  });

  // Basic user status endpoint
  app.get('/api/user-status', (req, res) => {
    res.json({
      id: 2,
      email: 'gailm@macleodglba.com.au', 
      name: 'Gail MacLeod',
      hasActiveSubscription: true,
      subscriptionType: 'professional',
      remainingPosts: 48
    });
  });

  // Basic platform connections endpoint
  app.get('/api/platform-connections', (req, res) => {
    res.json([
      { id: 1, platform: 'facebook', username: 'Gail MacLeod', isActive: true },
      { id: 2, platform: 'instagram', username: 'Gail MacLeod', isActive: true },
      { id: 3, platform: 'linkedin', username: 'Gail MacLeod', isActive: true },
      { id: 4, platform: 'twitter', username: 'Gail MacLeod', isActive: true },
      { id: 5, platform: 'youtube', username: 'Gail MacLeod', isActive: true }
    ]);
  });

  // Basic posts endpoint
  app.get('/api/posts', (req, res) => {
    res.json([]);
  });

  // Basic brand purpose endpoint
  app.get('/api/brand-purpose', (req, res) => {
    res.json({
      purpose: 'Empowering Queensland SMEs with AI-powered social media automation',
      target: 'Small and medium enterprises in Queensland',
      voice: 'Professional, friendly, and informative'
    });
  });

  // Catch-all for any other API endpoints
  // app.all('/api/*', (req, res) => {
  //   res.json({ message: 'API endpoint not implemented in minimal version' });
  // });

  const httpServer = createServer(app);
  return httpServer;
}