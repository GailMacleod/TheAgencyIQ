const express = require('express');
const path = require('path');
const app = express();

// Serve static files with proper MIME types
app.use(express.static('dist'));
app.use(express.static('public'));

// Serve the main HTML file for all routes (SPA routing)
app.get('*', (req, res) => {
  // Use index.html which now has the proper configuration
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

app.listen(5000, () => {
  console.log('✅ Server running on port 5000');
  console.log('📂 Serving files from: dist/');
  console.log('🌐 Access at: http://localhost:5000');
});