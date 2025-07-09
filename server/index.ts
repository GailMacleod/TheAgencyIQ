import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(express.static(path.join(__dirname, '../dist'), { 
  setHeaders: (res) => res.set('Content-Type', 'application/javascript') 
}));
app.use(express.static(path.join(__dirname, '../public')));

app.get('*', (req, res) => res.sendFile(path.join(__dirname, '../dist/index.html')));

app.listen(5000, () => console.log('Server running on port 5000'));