#!/usr/bin/env node

/**
 * PRODUCTION SERVER FOR THEAGENCYIQ
 * Bypasses Vite configuration issues and serves the application directly
 */

import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Enhanced MIME type configuration
const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.jsx': 'application/javascript; charset=utf-8',
  '.ts': 'application/javascript; charset=utf-8',
  '.tsx': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.eot': 'application/vnd.ms-fontobject'
};

// Set proper MIME types
app.use((req, res, next) => {
  const ext = path.extname(req.path).toLowerCase();
  if (mimeTypes[ext]) {
    res.setHeader('Content-Type', mimeTypes[ext]);
  }
  next();
});

// Serve static files from multiple locations
app.use(express.static(path.join(__dirname, 'client')));
app.use(express.static(path.join(__dirname, 'client/public')));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/src', express.static(path.join(__dirname, 'client/src')));

// Basic API endpoints for testing
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/posts', (req, res) => {
  // Return mock posts for testing
  const mockPosts = [];
  for (let i = 1; i <= 52; i++) {
    mockPosts.push({
      id: i,
      content: `Queensland business post ${i} - Brisbane market focus`,
      platform: ['Facebook', 'Instagram', 'LinkedIn', 'YouTube', 'X'][i % 5],
      status: i <= 10 ? 'approved' : 'draft',
      scheduledFor: new Date(Date.now() + (i * 86400000)).toISOString(),
      aiRecommendation: 'Optimized for Queensland SME market engagement'
    });
  }
  res.json(mockPosts);
});

// Serve React app for all other routes
app.get('*', (req, res) => {
  const indexPath = path.join(__dirname, 'client/index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).send('Application not found');
  }
});

app.listen(PORT, () => {
  console.log(`🚀 TheAgencyIQ Production Server running on port ${PORT}`);
  console.log(`📅 Deploy time: ${new Date().toLocaleString('en-AU', { timeZone: 'Australia/Brisbane' })}`);
  console.log('✅ Enhanced MIME type configuration enabled');
  console.log('🎯 Ready for comprehensive testing');
});