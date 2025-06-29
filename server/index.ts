// PRODUCTION SERVER - MINIMAL BULLETPROOF VERSION
const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

console.log('Starting minimal production server...');

// Basic middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, '../dist')));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    server: 'minimal-production',
    port: PORT
  });
});

// Basic API endpoints
app.get('/api/posts', (req, res) => {
  res.json({ posts: [], server: 'production' });
});

app.get('/api/platform-connections', (req, res) => {
  res.json({ connections: [], server: 'production' });
});

// Catch all - serve React app
app.get('*', (req, res) => {
  try {
    if (req.path.startsWith('/api/')) {
      return res.status(404).json({ error: 'API endpoint not found' });
    }
    res.sendFile(path.join(__dirname, '../dist', 'index.html'));
  } catch (error) {
    console.error('File serving error:', error);
    res.status(500).send('Server Error');
  }
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err.message);
  res.status(500).json({ error: 'Server error', message: err.message });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`PRODUCTION SERVER LIVE ON ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'production'}`);
  console.log(`Timestamp: ${new Date().toISOString()}`);
});