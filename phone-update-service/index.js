const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const twilio = require('twilio');
const cors = require('cors');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: '*', // Allow all origins for microservice
  credentials: true
}));

app.use(express.json());

// Global JSON enforcement
app.use((req, res, next) => {
  res.set('Content-Type', 'application/json');
  console.log('Microservice Request:', req.method, req.url);
  next();
});

// Twilio client
const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

// SQLite database initialization
const db = new sqlite3.Database('users.db');

// Initialize database tables
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    user_id TEXT PRIMARY KEY,
    email TEXT UNIQUE,
    subscription_plan TEXT DEFAULT 'starter',
    remaining_posts INTEGER DEFAULT 10,
    total_posts INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS post_ledger (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT,
    period_start TEXT,
    quota INTEGER,
    used_posts INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS post_schedule (
    post_id TEXT PRIMARY KEY,
    user_id TEXT,
    platform TEXT,
    content TEXT,
    status TEXT DEFAULT 'draft',
    is_counted INTEGER DEFAULT 0,
    scheduled_for DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS verification_codes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    phone TEXT,
    code TEXT,
    verified INTEGER DEFAULT 0,
    expires_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  console.log('Database tables initialized');
});

// Store verification codes temporarily (for two-step process)
const verificationCodes = new Map();

// Phone update endpoint with two-step verification
app.post('/update-phone', async (req, res) => {
  try {
    const { email, newPhone, verificationCode } = req.body;
    
    console.log(`Starting phone update for ${email}`);
    console.log(`Request body:`, req.body);
    
    // Step 1: Generate and send verification code
    if (!verificationCode || verificationCode === '' || verificationCode === undefined) {
      if (!email || !newPhone) {
        return res.status(400).json({ 
          error: "Email and new phone number are required" 
        });
      }

      // Generate random 6-digit code
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      
      // Store verification code with expiration
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
      verificationCodes.set(`${email}:${newPhone}`, {
        code,
        expiresAt,
        verified: false
      });

      // Also store in database for persistence
      db.run(
        'INSERT INTO verification_codes (phone, code, expires_at) VALUES (?, ?, ?)',
        [newPhone, code, expiresAt.toISOString()],
        function(err) {
          if (err) console.error('Database insert error:', err);
        }
      );

      // Send SMS via Twilio
      try {
        await twilioClient.messages.create({
          body: `Verification code: ${code}`,
          from: process.env.TWILIO_PHONE_NUMBER,
          to: newPhone
        });
        console.log(`SMS sent to ${newPhone} with code ${code}`);
      } catch (smsError) {
        console.log(`SMS sending failed, using development mode: ${smsError.message}`);
      }

      return res.json({ 
        success: true, 
        message: "Verification code sent to your phone",
        developmentCode: code  // Remove in production
      });
    }

    // Step 2: Verify code and update phone
    if (!email || !newPhone) {
      return res.status(400).json({ 
        error: "Email and new phone number are required" 
      });
    }

    // Verify SMS code
    const storedData = verificationCodes.get(`${email}:${newPhone}`);
    if (!storedData || storedData.code !== verificationCode || new Date() > storedData.expiresAt) {
      return res.status(400).json({ 
        error: "Invalid or expired verification code" 
      });
    }

    console.log(`SMS verified for ${email}: ${newPhone}`);

    // Get current user
    const getCurrentUser = () => {
      return new Promise((resolve, reject) => {
        db.get('SELECT * FROM users WHERE email = ?', [email], (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      });
    };

    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return res.status(404).json({ 
        error: "User not found in microservice database" 
      });
    }

    const oldPhone = currentUser.user_id || '+61434567890';

    // Perform data migration in SQLite
    const updateOperations = [
      // Update user with new phone UID
      new Promise((resolve, reject) => {
        db.run('UPDATE users SET user_id = ? WHERE email = ?', [newPhone, email], function(err) {
          if (err) reject(err);
          else resolve(this.changes);
        });
      }),
      
      // Migrate post_ledger data
      new Promise((resolve, reject) => {
        db.run('UPDATE post_ledger SET user_id = ? WHERE user_id = ?', [newPhone, oldPhone], function(err) {
          if (err) reject(err);
          else resolve(this.changes);
        });
      }),
      
      // Migrate post_schedule data
      new Promise((resolve, reject) => {
        db.run('UPDATE post_schedule SET user_id = ? WHERE user_id = ?', [newPhone, oldPhone], function(err) {
          if (err) reject(err);
          else resolve(this.changes);
        });
      })
    ];

    await Promise.all(updateOperations);

    // Mark verification code as used
    verificationCodes.delete(`${email}:${newPhone}`);
    db.run('UPDATE verification_codes SET verified = 1 WHERE phone = ? AND code = ?', [newPhone, verificationCode]);

    console.log(`Data migrated from ${oldPhone} to ${newPhone}`);

    res.json({ 
      success: true, 
      newPhone: newPhone,
      message: "Phone number updated successfully with complete data migration"
    });

  } catch (error) {
    console.error('Phone update error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    service: 'phone-update-microservice',
    timestamp: new Date().toISOString()
  });
});

// Data import endpoint (for syncing with Replit)
app.post('/import-data', (req, res) => {
  try {
    const { users, post_ledger, post_schedule } = req.body;
    
    console.log('Starting data import...');
    
    // Import users
    if (users && users.length > 0) {
      const userStmt = db.prepare('INSERT OR REPLACE INTO users (user_id, email, subscription_plan, remaining_posts, total_posts) VALUES (?, ?, ?, ?, ?)');
      
      users.forEach(user => {
        userStmt.run([
          user.userId || user.phone || user.email,
          user.email,
          user.subscriptionPlan || 'starter',
          user.remainingPosts || 10,
          user.totalPosts || 0
        ]);
      });
      
      userStmt.finalize();
      console.log(`Imported ${users.length} users`);
    }
    
    // Import post ledger
    if (post_ledger && post_ledger.length > 0) {
      const ledgerStmt = db.prepare('INSERT OR REPLACE INTO post_ledger (user_id, period_start, quota, used_posts) VALUES (?, ?, ?, ?)');
      
      post_ledger.forEach(ledger => {
        ledgerStmt.run([
          ledger.user_id,
          ledger.period_start,
          ledger.quota,
          ledger.used_posts
        ]);
      });
      
      ledgerStmt.finalize();
      console.log(`Imported ${post_ledger.length} ledger entries`);
    }
    
    // Import post schedule
    if (post_schedule && post_schedule.length > 0) {
      const scheduleStmt = db.prepare('INSERT OR REPLACE INTO post_schedule (post_id, user_id, platform, content, status, is_counted, scheduled_for) VALUES (?, ?, ?, ?, ?, ?, ?)');
      
      post_schedule.forEach(schedule => {
        scheduleStmt.run([
          schedule.post_id || schedule.id,
          schedule.user_id,
          schedule.platform,
          schedule.content,
          schedule.status || 'draft',
          schedule.is_counted || 0,
          schedule.scheduled_for
        ]);
      });
      
      scheduleStmt.finalize();
      console.log(`Imported ${post_schedule.length} schedule entries`);
    }
    
    res.json({ 
      success: true, 
      message: 'Data imported successfully',
      imported: {
        users: users?.length || 0,
        post_ledger: post_ledger?.length || 0,
        post_schedule: post_schedule?.length || 0
      }
    });
    
  } catch (error) {
    console.error('Data import error:', error);
    res.status(500).json({ 
      error: 'Import failed',
      details: error.message 
    });
  }
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Microservice Error:', err.stack);
  res.status(500).json({ 
    error: 'Microservice error',
    details: err.message 
  });
});

app.listen(port, () => {
  console.log(`Phone Update Microservice running on port ${port}`);
  console.log('Twilio integration ready');
  console.log('SQLite database initialized');
  console.log('Ready for ngrok tunneling');
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('Shutting down microservice...');
  db.close((err) => {
    if (err) console.error('Error closing database:', err);
    else console.log('Database connection closed');
    process.exit(0);
  });
});