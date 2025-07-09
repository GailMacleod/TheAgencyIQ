import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.static(path.join(__dirname, '../dist'), { 
  setHeaders: (res) => res.set('Content-Type', 'application/javascript') 
}));
app.use(express.static(path.join(__dirname, '../public')));

app.get('*', (req, res) => res.sendFile(path.join(__dirname, '../dist/index.html')));

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`📂 Serving files from: ${path.join(__dirname, '../dist')}`);
  console.log(`🌐 Access at: http://localhost:${PORT}`);
});