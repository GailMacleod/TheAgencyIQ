import express from 'express';
import path from 'path';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 5000;

// Basic middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Basic health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Basic user endpoint
app.get('/api/user', (req, res) => {
  res.json({ 
    id: 2, 
    email: 'gailm@macleodglba.com.au',
    subscription: 'professional'
  });
});

// Serve static files
app.use(express.static(path.join(process.cwd(), 'dist/public')));

// Catch-all handler for React app
app.get('*', (req, res) => {
  res.sendFile(path.join(process.cwd(), 'dist/public/index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});