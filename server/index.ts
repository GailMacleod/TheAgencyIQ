/// <reference types="node" />

import express from 'express';
import bodyParser from 'body-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const baseUrl = process.env.NODE_ENV === 'production'
  ? 'https://app.theagencyiq.ai'
  : 'https://4fc77172-459a-4da7-8c33-5014abb1b73e-00-dqhtnud4ismj.worf.replit.dev';

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use((req: any, res: any, next: any) => {
  res.set({
    'Access-Control-Allow-Origin': '*',
    'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://app.theagencyiq.ai https://4fc77172-459a-4da7-8c33-5014abb1b73e-00-dqhtnud4ismj.worf.replit.dev https://replit.com; style-src 'self' 'unsafe-inline'; connect-src 'self' https://graph.facebook.com;"
  });
  next();
});

app.all('/facebook', (req: any, res: any) => {
  try {
    const { code, signed_request, error } = { ...req.body, ...req.query };
    if (code) {
      res.status(200).json({
        message: 'Login successful',
        redirect: `${baseUrl}/platform-connections?code=${encodeURIComponent(code)}`
      });
    } else if (signed_request) {
      res.status(200).json({
        url: `${baseUrl}/deletion-status`,
        confirmation_code: 'del_' + Math.random().toString(36).substr(2, 9)
      });
    } else if (error) {
      throw new Error(`Facebook error: ${error}`);
    } else {
      throw new Error('Invalid request');
    }
  } catch (error: any) {
    console.error('Facebook Error:', error.stack);
    res.status(500).json({ error: 'Server issue', details: error.message });
  }
});

app.get('/platform-connections', (req: any, res: any) => {
  try {
    const { code, error } = req.query;
    if (!code && !error) {
      return res.status(400).json({ error: 'Missing code or error parameter' });
    }
    if (error) {
      return res.status(400).json({ error: 'Login failed', message: error });
    }
    res.status(200).json({ message: 'Platform connected', code });
  } catch (error: any) {
    console.error('Platform Error:', error.stack);
    res.status(500).json({ error: 'Server issue', details: error.message });
  }
});

const publicDir = path.join(__dirname, '..', 'dist', 'public');
app.use(express.static(publicDir));
app.get('/manifest.json', (req: any, res: any) => {
  res.set('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline';");
  res.sendFile(path.join(publicDir, 'manifest.json'), (err: any) => {
    if (err) res.status(404).json({ error: 'Manifest missing' });
  });
});
app.get('/public/js/beacon.js', (req: any, res: any) => {
  res.sendFile(path.join(publicDir, 'js', 'beacon.js'), (err: any) => err && res.status(404).json({ error: 'Beacon missing' }));
});
app.get('/replit-proxy/beacon.js', (req: any, res: any) => {
  res.redirect(301, '/public/js/beacon.js');
});
app.get('*', (req: any, res: any) => {
  res.sendFile(path.join(publicDir, 'index.html'), (err: any) => {
    if (err) {
      console.error('Index.html Error:', err.stack);
      res.status(500).json({ error: 'Failed to load app', details: err.message });
    }
  });
});

process.on('uncaughtException', (error: any) => console.error('Uncaught:', error.stack));

const PORT = Number(process.env.PORT) || 5000;
app.listen(PORT, '0.0.0.0', () => console.log(`Live on ${PORT}`));