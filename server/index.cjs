const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const app = express();
const baseUrl = process.env.NODE_ENV === 'production'
  ? 'https://app.theagencyiq.ai'
  : 'https://4fc77172-459a-4da7-8c33-5014abb1b73e-00-dqhtnud4ismj.worf.replit.dev';

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use((req, res, next) => {
  res.set({
    'Access-Control-Allow-Origin': '*',
    'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://app.theagencyiq.ai https://4fc77172-459a-4da7-8c33-5014abb1b73e-00-dqhtnud4ismj.worf.replit.dev https://replit.com; connect-src 'self' https://graph.facebook.com;"
  });
  next();
});

app.get('/api/health', (req, res) => {
  res.status(200).json({ message: 'Server is healthy' });
});

const publicDir = path.join(__dirname, 'dist', 'public');
app.use(express.static(publicDir));
app.get('*', (req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'), (err) => {
    if (err) {
      console.error('Index.html Error:', err.stack);
      res.status(500).json({ error: 'Failed to load app', details: err.message });
    }
  });
});

process.on('uncaughtException', (error) => console.error('Uncaught:', error.stack));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Live on ${PORT}`));