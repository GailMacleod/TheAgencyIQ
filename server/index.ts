import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(express.static('dist', { 
  setHeaders: (res) => res.set('Content-Type', 'application/javascript') 
}));

app.use(express.static('public'));

app.get('*', (req, res) => res.sendFile(path.resolve(__dirname, '../dist/index.html')));

app.listen(5000, () => {
  console.log('TheAgencyIQ Server running on port 5000');
});