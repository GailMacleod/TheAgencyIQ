import { Express } from 'express';
import { storage } from './storage';

/**
 * Minimal routes configuration to get the server running
 * This bypasses the path-to-regexp error temporarily
 */
export async function registerRoutes(app: Express) {
  console.log('🚀 Loading minimal routes configuration...');
  
  // Basic health check
  app.get('/api/health', (req, res) => {
    res.json({ 
      status: 'healthy',
      timestamp: new Date().toISOString(),
      server: 'operational'
    });
  });

  // Basic login endpoint
  app.post('/api/login', async (req, res) => {
    try {
      const { email, password } = req.body;
      
      // Simple authentication check
      if (email === 'gailm@macleodglba.com.au' && password === 'testpass') {
        const user = await storage.getUserByEmail(email);
        
        if (user) {
          req.session.userId = user.id;
          req.session.userEmail = user.email;
          
          res.json({
            success: true,
            user: {
              id: user.id,
              email: user.email,
              subscriptionPlan: user.subscriptionPlan
            }
          });
        } else {
          res.status(401).json({ success: false, message: 'User not found' });
        }
      } else {
        res.status(401).json({ success: false, message: 'Invalid credentials' });
      }
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ success: false, message: 'Login failed' });
    }
  });

  // Basic user status endpoint
  app.get('/api/user', (req, res) => {
    if (req.session?.userId) {
      res.json({
        authenticated: true,
        userId: req.session.userId,
        userEmail: req.session.userEmail
      });
    } else {
      res.json({ authenticated: false });
    }
  });

  console.log('✅ Minimal routes registered successfully');
}