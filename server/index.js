import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(express.static('dist', { 
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.html')) {
      res.set('Content-Type', 'text/html');
    } else if (filePath.endsWith('.js')) {
      res.set('Content-Type', 'application/javascript');
    } else if (filePath.endsWith('.css')) {
      res.set('Content-Type', 'text/css');
    }
  }
}));

app.use(express.static('public'));

app.get('*', (req, res) => res.sendFile('dist/index.html', { root: path.join(__dirname, '..') }));

const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`TheAgencyIQ Server running on port ${PORT}`);
});