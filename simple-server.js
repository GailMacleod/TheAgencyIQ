const express = require('express');
const path = require('path');
const app = express();

console.log('Starting simple server...');
console.log('Current directory:', process.cwd());

// Serve static files
app.use(express.static('dist'));
app.use(express.static('public'));

// Handle all routes with index.html
app.get('*', (req, res) => {
  const indexPath = path.join(__dirname, 'dist', 'index.html');
  console.log('Serving index.html from:', indexPath);
  res.sendFile(indexPath);
});

const PORT = 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`📂 Serving files from: ${path.join(__dirname, 'dist')}`);
  console.log(`🌐 Access at: http://localhost:${PORT}`);
});