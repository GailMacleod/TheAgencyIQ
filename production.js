const express = require('express');
const app = express();
const PORT = process.env.PORT || 5000;

// Basic middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS and headers
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin,X-Requested-With,Content-Type,Accept,Authorization');
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Platform connections endpoint
app.get('/platform-connections', (req, res) => {
  const { code, error } = req.query;
  if (code) {
    res.json({ message: 'Platform connected', code });
  } else if (error) {
    res.json({ error: 'Login failed', message: error });
  } else {
    res.json({ error: 'Missing parameters' });
  }
});

// Facebook endpoint
app.all('/facebook', (req, res) => {
  const { code, signed_request, error } = { ...req.body, ...req.query };
  if (code) {
    res.json({ message: 'Login successful', code });
  } else if (signed_request) {
    res.json({ url: 'https://app.theagencyiq.ai/deletion-status', confirmation_code: 'del_123' });
  } else {
    res.json({ error: 'Invalid request' });
  }
});

// Catch all
app.get('*', (req, res) => {
  res.json({ error: 'Endpoint not found', path: req.path });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  res.status(500).json({ error: 'Server error' });
});

app.listen(PORT, () => {
  console.log(`Production server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV}`);
});