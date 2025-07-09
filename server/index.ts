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

app.get('*', (req, res) => res.sendFile('dist/index.html', { root: process.cwd() }));

app.listen(5000, () => {
  console.log('Server running on port 5000');
});