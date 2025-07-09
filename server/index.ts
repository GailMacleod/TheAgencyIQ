const express = require('express');
const app = express();

app.use(express.static('dist', { 
  setHeaders: (res) => res.set('Content-Type', 'application/javascript') 
}));
app.use(express.static('public'));

app.get('*', (req, res) => res.sendFile('dist/index.html', { root: __dirname }));

app.listen(5000);