const express = require('express');
const path = require('path');
const app = express();

app.use(express.static('dist', { 
  setHeaders: (res) => res.set('Content-Type', 'application/javascript') 
}));

app.use(express.static('public'));

app.get('*', (req, res) => res.sendFile(path.join(__dirname, '../dist/index.html')));

app.listen(5000, '0.0.0.0', () => {
  console.log('TheAgencyIQ Server running on port 5000');
  console.log('Frontend restored to 12:48 PM AEST July 9, 2025 configuration');
  console.log('Static files served from dist/ directory');
});