const express = require('express');
const path = require('path');

const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Trust proxy for Replit environment
app.set('trust proxy', 1);

// Basic middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve favicon.ico with proper MIME type
app.get('/favicon.ico', (req, res) => {
  try {
    res.setHeader('Content-Type', 'image/x-icon');
    res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 24 hours
    res.sendFile(path.join(__dirname, 'public', 'favicon.ico'));
  } catch (error) {
    console.error('Favicon error:', error);
    res.status(404).send('Favicon not found');
  }
});

// Serve static files from public directory
app.use('/public', express.static(path.join(__dirname, 'public')));
app.use('/', express.static(path.join(__dirname, 'public')));

// Basic health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    server: 'operational'
  });
});

// Handle manifest.json
app.get('/manifest.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.sendFile(path.join(__dirname, 'public', 'manifest.json'));
});

// Default route
app.get('/', (req, res) => {
  res.send(`
    <html>
      <head>
        <title>TheAgencyIQ - Loading...</title>
        <link rel="icon" href="/favicon.ico" type="image/x-icon">
        <link rel="manifest" href="/manifest.json">
      </head>
      <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
        <h1>TheAgencyIQ</h1>
        <p>Server is running successfully!</p>
        <p>✅ Favicon: <a href="/favicon.ico">favicon.ico</a></p>
        <p>✅ Manifest: <a href="/manifest.json">manifest.json</a></p>
        <p>✅ Health: <a href="/api/health">API Health Check</a></p>
      </body>
    </html>
  `);
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📁 Serving files from: ${__dirname}`);
  console.log(`🌐 Access at: http://localhost:${PORT}`);
  console.log(`✅ Favicon configured at: /favicon.ico`);
  console.log(`✅ Manifest configured at: /manifest.json`);
});