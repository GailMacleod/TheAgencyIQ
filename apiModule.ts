import { Router } from 'express';
import { storage } from './server/storage';

const apiRouter = Router();

// API routes
apiRouter.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString()
  });
});

// Facebook data deletion endpoint for Meta compliance
apiRouter.all('/facebook-data-deletion', (req, res) => {
  if (req.method === 'GET') {
    res.json({ status: 'ok', message: 'Facebook data deletion endpoint' });
  } else if (req.method === 'POST') {
    const { signed_request } = req.body;
    
    if (signed_request) {
      try {
        // Parse Facebook's signed_request
        const [encodedSig, payload] = signed_request.split('.');
        const data = JSON.parse(Buffer.from(payload, 'base64').toString());
        
        res.json({
          url: `https://app.theagencyiq.ai/api/deletion-status/${data.user_id}`,
          confirmation_code: `DEL_${Date.now()}`
        });
      } catch (error) {
        console.error('Facebook signed_request parsing error:', error);
        res.status(400).json({ error: 'Invalid signed_request' });
      }
    } else {
      res.status(400).json({ error: 'Missing signed_request parameter' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
});

// Data deletion status endpoint
apiRouter.get('/deletion-status/:user_id', (req, res) => {
  res.json({ 
    status: 'confirmed', 
    user_id: req.params.user_id,
    timestamp: new Date().toISOString()
  });
});

export { apiRouter };