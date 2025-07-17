import express from 'express';
import { createServer } from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

// Basic middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
    return;
  }
  
  next();
});

// Static file serving
app.use(express.static(path.join(__dirname, '../public')));

// Basic API route
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'TheAgencyIQ Server is running',
    timestamp: new Date().toISOString()
  });
});

// Basic user status endpoint
app.get('/api/user-status', (req, res) => {
  res.json({
    userId: 2,
    email: 'gailm@macleodglba.com.au',
    subscriptionPlan: 'Professional',
    subscriptionActive: true,
    hasActiveSubscription: true
  });
});

// Basic user endpoint
app.get('/api/user', (req, res) => {
  res.json({
    id: 2,
    email: 'gailm@macleodglba.com.au',
    name: 'Gail Macleod',
    subscriptionPlan: 'Professional',
    subscriptionActive: true
  });
});

// Serve React app for non-API routes
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(__dirname, '../public/index.html'));
  } else {
    res.status(404).json({ error: 'API endpoint not found' });
  }
});

// Create HTTP server
const server = createServer(app);

// Start server
server.listen(port, () => {
  console.log(`🚀 TheAgencyIQ Server running on port ${port}`);
  console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('Received SIGTERM, shutting down gracefully...');
  server.close(() => {
    console.log('Server closed.');
    process.exit(0);
  });
});