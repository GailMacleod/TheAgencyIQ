const express = require('express');
const path = require('path');
const { OAuth2Client } = require('google-auth-library');

const app = express();

app.use(express.static('dist', { 
  setHeaders: (res) => res.set('Content-Type', 'application/javascript') 
}));

app.use(express.static('public'));

app.get('*', (req, res) => res.sendFile(path.resolve(__dirname, '../dist/index.html')));

app.listen(5000, () => {
  console.log('TheAgencyIQ Server running on port 5000');
});