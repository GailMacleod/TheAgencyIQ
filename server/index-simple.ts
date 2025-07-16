import express from 'express';
import session from 'express-session';
import connectSqlite3 from 'connect-sqlite3';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { createServer } from 'http';
import path from 'path';
// import { storage } from './storage'; // Disabled for now

async function startServer() {
  const app = express();

  // Trust proxy for Replit
  app.set('trust proxy', 1);

  // Basic middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser('secret'));

  // CORS
  app.use(cors({
    origin: true,
    credentials: true
  }));

  // Session setup
  const SQLiteStore = connectSqlite3(session);
  app.use(session({
    store: new SQLiteStore({ db: 'sessions.db' }),
    secret: 'secret',
    resave: false,
    saveUninitialized: false,
    cookie: { 
      secure: false, 
      httpOnly: false,
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000 
    }
  }));

  // Simple auth middleware
  const authGuard = async (req: any, res: any, next: any) => {
    if (req.session?.userId) {
      next();
    } else {
      // Auto-login as user 2 for demo
      req.session.userId = 2;
      req.session.userEmail = 'gailm@macleodglba.com.au';
      req.session.save(() => next());
    }
  };

  // Essential routes only
  app.get('/api/health', (req, res) => {
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
  });

  app.post('/api/establish-session', async (req, res) => {
    req.session.userId = 2;
    req.session.userEmail = 'gailm@macleodglba.com.au';
    req.session.save(() => {
      res.json({ 
        success: true, 
        userId: 2, 
        sessionId: req.sessionID 
      });
    });
  });

  app.get('/api/user', authGuard, async (req: any, res) => {
    res.json({ 
      id: 2, 
      email: 'gailm@macleodglba.com.au',
      phone: '+61424835189',
      name: 'Gail MacLeod' 
    });
  });

  app.get('/api/user-status', authGuard, async (req: any, res) => {
    res.json({ 
      authenticated: true, 
      userId: req.session.userId,
      email: req.session.userEmail,
      hasActiveSubscription: true 
    });
  });

  app.get('/api/platform-connections', authGuard, async (req: any, res) => {
    res.json([
      { id: 1, platform: 'facebook', username: 'Gail MacLeod', isActive: true },
      { id: 2, platform: 'instagram', username: 'Gail MacLeod', isActive: true },
      { id: 3, platform: 'linkedin', username: 'Gail MacLeod', isActive: true },
      { id: 4, platform: 'twitter', username: 'Gail MacLeod', isActive: true },
      { id: 5, platform: 'youtube', username: 'Gail MacLeod', isActive: true }
    ]);
  });

  // Static file serving
  app.use('/attached_assets', express.static('attached_assets'));

  // Static file serving for production
  app.use(express.static('dist'));
  
  // Catch-all handler for SPA
  app.get('*', (req, res) => {
    res.sendFile(path.resolve('dist/index.html'));
  });

  // Start server
  const server = createServer(app);
  const PORT = process.env.PORT || 5000;
  
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`TheAgencyIQ Server running on port ${PORT}`);
    console.log(`Visit: https://4fc77172-459a-4da7-8c33-5014abb1b73e-00-dqhtnud4ismj.worf.replit.dev`);
  });
}

startServer().catch(console.error);