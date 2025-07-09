import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(express.static(path.join(__dirname, '../dist'), { 
  setHeaders: (res, path) => {
    if (path.endsWith('.html')) {
      res.set('Content-Type', 'text/html');
    } else if (path.endsWith('.js')) {
      res.set('Content-Type', 'application/javascript');
    } else if (path.endsWith('.css')) {
      res.set('Content-Type', 'text/css');
    }
  }
}));
app.use(express.static(path.join(__dirname, '../public')));

app.get('*', (req, res) => res.sendFile(path.join(__dirname, '../dist/index.html')));

app.listen(5000, () => console.log('Server running on port 5000'));