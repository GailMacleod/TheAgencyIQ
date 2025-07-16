const express = require('express');
const app = express();

// Test if the path-to-regexp error occurs with duplicate routes
app.get('/test/:param', (req, res) => {
  res.json({ message: 'first route' });
});

// Try to register the same route again - this should cause the error
app.get('/test/:param', (req, res) => {
  res.json({ message: 'second route' });
});

app.listen(3000, () => {
  console.log('Test server started on port 3000');
});