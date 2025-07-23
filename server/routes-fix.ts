// Quick fix for session establishment
import type { Express, Request, Response } from 'express';

export function addSessionFix(app: Express) {
  // Simple session establishment endpoint that works
  app.post('/api/establish-session', async (req: Request, res: Response) => {
    try {
      console.log('📝 Simple session establishment request');
      
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
  app.get('/api/onboarding/status', (req: Request, res: Response) => {
    res.json({
      sessionEstablished: !!req.session?.userId,
      onboardingComplete: false,
      guestMode: req.session?.userId?.startsWith('guest_') || false
    });
  });
}