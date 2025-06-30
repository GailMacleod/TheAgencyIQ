import express from 'express';
import fs from 'fs';
const app = express();
const port = 5000;

app.use(express.json());

// Health check endpoint for monitoring
app.get('/ping', (req, res) => {
  res.json({ status: 'ok' });
});

// Test error endpoint for monitoring alerts
app.get('/test-error', (req, res) => {
  const errorLog = `${new Date().toISOString()} - Test Error 500 - Monitoring test failure initiated\n`;
  fs.appendFileSync('logs.txt', errorLog);
  res.status(500).json({ error: 'Test failure for monitoring system' });
});

// Facebook callback with enhanced logging
app.get('/auth/facebook/callback', (req, res) => {
  const { code, state, error } = req.query;
  const logEntry = `${new Date().toISOString()} - Facebook OAuth Callback - Time: ${new Date().toISOString()}, Code: ${req.query.code}, State: ${req.query.state}, Error: ${req.query.error || 'None'}\n`;
  fs.appendFileSync('logs.txt', logEntry);
  
  if (error) {
    const errorLog = `${new Date().toISOString()} - Facebook OAuth Error - ${error}\n`;
    fs.appendFileSync('logs.txt', errorLog);
    return res.redirect('/connect-platforms?error=facebook_oauth_denied');
  }
  
  res.json({ success: true, message: 'Facebook callback logged' });
});

app.listen(port, () => {
  console.log(`Simple monitoring server running on port ${port}`);
  console.log(`Monitoring endpoints:`);
  console.log(`- Health check: http://localhost:${port}/ping`);
  console.log(`- Test error: http://localhost:${port}/test-error`);
  
  // Initial log entry
  const startLog = `${new Date().toISOString()} - Server started - Monitoring system active\n`;
  fs.appendFileSync('logs.txt', startLog);
});