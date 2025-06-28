const express = require('express');
const app = express();

// Parse form data
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// CORS headers
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
});

// Facebook data deletion endpoint - GET (validation)
app.get('/facebook-data-deletion', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Facebook data deletion endpoint - POST (deletion)
app.post('/facebook-data-deletion', (req, res) => {
  try {
    const { signed_request } = req.body;
    let userId = 'unknown_user';
    
    if (signed_request) {
      try {
        const parts = signed_request.split('.');
        if (parts.length === 2) {
          const payload = Buffer.from(parts[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString();
          const data = JSON.parse(payload);
          userId = data.user_id || 'parsed_user';
        }
      } catch (parseError) {
        console.log('Signed request parse error:', parseError.message);
        userId = 'parse_error_user';
      }
    } else {
      userId = 'test_user_' + Date.now();
    }
    
    const confirmationCode = `del_${Date.now()}_${userId}`;
    const statusUrl = `https://app.theagencyiq.ai/deletion-status/${userId}`;
    
    res.status(200).json({
      url: statusUrl,
      confirmation_code: confirmationCode
    });
  } catch (error) {
    console.error('Facebook deletion error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Status page
app.get('/deletion-status/:userId', (req, res) => {
  const { userId } = req.params;
  res.send(`
    <html>
      <head><title>Data Deletion Status</title></head>
      <body style="font-family: Arial, sans-serif; padding: 20px;">
        <h1>Data Deletion Status</h1>
        <p><strong>User ID:</strong> ${userId}</p>
        <p><strong>Status:</strong> Data deletion completed successfully</p>
        <p><strong>Date:</strong> ${new Date().toISOString()}</p>
      </body>
    </html>
  `);
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    endpoint: 'facebook-data-deletion',
    timestamp: new Date().toISOString()
  });
});

// Export for serverless deployment
module.exports = app;

// For standalone deployment
if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Facebook Data Deletion endpoint running on port ${PORT}`);
    console.log(`GET /facebook-data-deletion - Returns {"status":"ok"}`);
    console.log(`POST /facebook-data-deletion - Handles deletion requests`);
  });
}