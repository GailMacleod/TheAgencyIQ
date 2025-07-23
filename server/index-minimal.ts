import express from 'express';
import { createServer } from 'http';
import session from 'express-session';
import connectPg from 'connect-pg-simple';
import { db } from './db';

const app = express();

// Trust proxy for Replit
app.set('trust proxy', 1);

// JSON middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// PostgreSQL session store
const PgStore = connectPg(session);
app.use(session({
  store: new PgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: true,
    tableName: 'sessions',
    ttl: 24 * 60 * 60 * 1000 // 24 hours
  }),
  secret: process.env.SESSION_SECRET!,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // Set to true in production with HTTPS
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Simple session establishment endpoint
app.post('/api/establish-session', async (req, res) => {
  try {
    console.log('📝 Session establishment request');
    
    // Create basic guest session
    if (req.session) {
      req.session.userId = `guest_${Date.now()}`;
      req.session.userEmail = 'guest@theagencyiq.ai';
      req.session.establishedAt = new Date();
      
      // Save session explicitly
      await new Promise<void>((resolve, reject) => {
        req.session.save((err: any) => {
          if (err) {
            console.error('Session save error:', err);
            reject(err);
          } else {
            console.log('✅ Guest session established successfully');
            resolve();
          }
        });
      });
      
      res.json({
        success: true,
        sessionType: 'guest',
        sessionId: req.sessionID,
        userId: req.session.userId,
        message: 'Session established successfully'
      });
    } else {
      throw new Error('Session middleware not initialized');
    }
  } catch (error: any) {
    console.error('❌ Session establishment failed:', error);
    res.status(400).json({
      success: false,
      error: 'Session establishment failed',
      details: error.message
    });
  }
});

// Simple onboarding status endpoint
app.get('/api/onboarding/status', (req, res) => {
  res.json({
    sessionEstablished: !!req.session?.userId,
    onboardingComplete: false,
    guestMode: req.session?.userId?.startsWith('guest_') || false
  });
});

// Basic health endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Root route
app.get('/', (req, res) => {
  res.send('<h1>TheAgencyIQ Server</h1><p>Session establishment working!</p>');
});

// Start server
const httpServer = createServer(app);
const port = process.env.PORT || 5000;

httpServer.listen(port, '0.0.0.0', () => {
  console.log(`🚀 Minimal server running on port ${port}`);
  console.log(`🌐 Ready for session establishment testing`);
});