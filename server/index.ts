const express = require('express');
const path = require('path');
const app = express();

// Serve static files with proper MIME types
app.use(express.static('dist'));
app.use(express.static('public'));

// Handle React routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist/index.html'));
});

app.listen(5000, () => {
  console.log('✅ Server running on port 5000');
  console.log('📂 Serving files from: dist/');
  console.log('🌐 Access at: http://localhost:5000');
});