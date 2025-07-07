const express = require('express');
const app = express();

app.use(express.static('public', { 
  setHeaders: (res) => res.set('Content-Type', 'application/javascript') 
}));

app.use(express.static('dist'));

app.get('*', (req, res) => res.status(404).send('Not Found'));

app.listen(5000);
console.log('TheAgencyIQ server running on port 5000');