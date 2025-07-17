import express from 'express';

const app = express();

// Test minimal routes to isolate the path-to-regexp issue
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
app.get('/api/connect/:platform', (req, res) => res.json({ platform: req.params.platform }));
app.get('/api/deletion-status/:userId', (req, res) => res.json({ userId: req.params.userId }));

console.log('Routes registered successfully!');