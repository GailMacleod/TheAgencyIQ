import express from 'express';
import path from 'path';
const app = express();

// Explicit middleware to force correct MIME types for all JS/TS files
app.use((req, res, next) => {
  if (req.path.endsWith('.tsx') || req.path.endsWith('.ts') || req.path.endsWith('.js') || req.path.endsWith('.jsx')) {
    res.setHeader('Content-Type', 'application/javascript');
  }
  next();
});

// Serve client files
app.use(express.static('client'));
app.use(express.static('public'));

// Fallback to serve React app
app.get('*', (req, res) => {
  res.sendFile(path.join(process.cwd(), 'client', 'simple-index.html'));
});

app.listen(5000, () => {
  console.log('TheAgencyIQ Server with explicit MIME types running on port 5000');
});