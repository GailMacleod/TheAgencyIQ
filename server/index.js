const express = require('express');
const path = require('path');
const app = express();

// Serve static files from dist and public directories
app.use(express.static(path.join(__dirname, '../dist'), { 
  setHeaders: (res) => res.set('Content-Type', 'application/javascript') 
}));
app.use(express.static(path.join(__dirname, '../public')));

// Serve index.html for all routes
app.get('*', (req, res) => res.sendFile(path.join(__dirname, '../dist/index.html')));

app.listen(5000, () => console.log('Server running on port 5000'));