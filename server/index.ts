import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();

// Serve JavaScript files with proper Content-Type
app.use('/main.js', express.static('dist/main.js', { 
  setHeaders: (res) => res.set('Content-Type', 'application/javascript') 
}));

app.use(express.static('dist'));
app.use(express.static('public'));

app.get('*', (req, res) => res.sendFile(join(__dirname, 'dist/index.html')));

app.listen(5000, () => {
  console.log('TheAgencyIQ Server running on port 5000');
  console.log('Simplified Express setup with static file serving');
  console.log('Serving main.js with proper Content-Type header');
});