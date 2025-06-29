import express from 'express';

const app = express();
const PORT = process.env.PORT || 5000;

// Minimal middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin,X-Requested-With,Content-Type,Accept');
  next();
});

// Health endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), port: PORT });
});

// Platform connections
app.get('/platform-connections', (req, res) => {
  const { code, error } = req.query;
  res.json({ 
    message: code ? 'Platform connected' : 'Connection attempt', 
    code: code || null,
    error: error || null
  });
});

// Facebook endpoint
app.all('/facebook', (req, res) => {
  const { code, signed_request, error } = { ...req.body, ...req.query };
  res.json({ 
    message: 'Facebook endpoint', 
    received: { code: !!code, signed_request: !!signed_request, error: !!error }
  });
});

// API endpoints
app.get('/api/posts', (req, res) => {
  res.json({ posts: [], message: 'API operational' });
});

app.get('/api/platform-connections', (req, res) => {
  res.json({ connections: [], message: 'Connections API operational' });
});

// Catch all
app.get('*', (req, res) => {
  res.json({ 
    message: 'TheAgencyIQ Production Server',
    path: req.path,
    timestamp: new Date().toISOString()
  });
});

// Simple error handler
app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  res.status(500).json({ error: 'Server error', message: err.message });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`PRODUCTION SERVER LIVE ON ${PORT}`);
  console.log(`Timestamp: ${new Date().toISOString()}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'production'}`);
});