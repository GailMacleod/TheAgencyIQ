const express = require('express');
const path = require('path');
const app = express();

const PORT = process.env.PORT || 5000;

// Basic middleware
app.use(express.static(path.join(__dirname, 'dist')));
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Catch all - serve React app
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Production server running on ${PORT}`);
});