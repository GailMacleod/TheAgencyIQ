import express from 'express';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();

app.use(express.static('dist', { 
  setHeaders: (res, path) => {
    if (path.endsWith('.js')) {
      res.set('Content-Type', 'application/javascript');
    } else if (path.endsWith('.css')) {
      res.set('Content-Type', 'text/css');
    }
  }
}));

app.use(express.static('public'));
app.use(express.static('dist'));

app.get('*', (req, res) => {
  // Skip catch-all for API routes
  if (req.path.startsWith('/api/')) {
    return res.status(404).send('Not found');
  }
  res.sendFile('dist/index-fixed.html', { root: process.cwd() });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});