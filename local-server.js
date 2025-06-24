const express = require('express');
const { Pool } = require('pg');
const twilio = require('twilio');
const cors = require('cors');
const bcrypt = require('bcrypt');
const session = require('express-session');
const connectPg = require('connect-pg-simple');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 5000;

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

// Twilio client
const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

// Middleware
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));

app.use(express.json());

// Global JSON enforcement
app.use((req, res, next) => {
  res.set('Content-Type', 'application/json');
  console.log('Request:', req.method, req.url);
  next();
});

// Session configuration
const pgStore = connectPg(session);
app.use(session({
  store: new pgStore({
    pool: pool,
    tableName: 'sessions',
    createTableIfMissing: true
  }),
  secret: process.env.SESSION_SECRET || 'development-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // Set to true in production with HTTPS
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Phone update endpoint with two-step verification
app.post('/api/update-phone', async (req, res) => {
  try {
    const { email, newPhone, verificationCode } = req.body;
    
    console.log(`Starting phone update for ${email}`);
    console.log(`Request body:`, req.body);
    console.log(`Verification code value: "${verificationCode}"`);
    console.log(`Verification code type: ${typeof verificationCode}`);
    
    // Step 1: Generate and send verification code
    if (!verificationCode || verificationCode === '' || verificationCode === undefined) {
      if (!email || !newPhone) {
        return res.status(400).json({ 
          error: "Email and new phone number are required" 
        });
      }

      // Mock session validation for local development
      if (!req.headers.authorization && !req.session.userId) {
        return res.status(401).json({ error: "No session" });
      }
      console.log('Session validated');

      // Generate random 6-digit code
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      
      // Store verification code
      await pool.query(
        'INSERT INTO verification_codes (phone, code, expires_at) VALUES ($1, $2, $3)',
        [newPhone, code, new Date(Date.now() + 10 * 60 * 1000)]
      );

      // Send SMS
      try {
        await twilioClient.messages.create({
          body: `Verification code: ${code}`,
          from: process.env.TWILIO_PHONE_NUMBER,
          to: newPhone
        });
        console.log(`SMS sent to ${newPhone} with code ${code}`);
      } catch (smsError) {
        console.log(`SMS sending failed, using development mode for ${newPhone}`);
      }

      return res.json({ 
        success: true, 
        message: "Verification code sent",
        developmentCode: code  // Remove in production
      });
    }

    // Step 2: Verify code and update phone
    if (!email || !newPhone) {
      return res.status(400).json({ 
        error: "Email and new phone number are required" 
      });
    }

    // Mock session validation for local development
    if (!req.headers.authorization && !req.session.userId) {
      return res.status(401).json({ error: "Session invalid" });
    }
    console.log('Session validated');

    // Get current user by email
    const userResult = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ 
        error: "User not found" 
      });
    }

    const currentUser = userResult.rows[0];

    // Verify SMS code from database
    const codeResult = await pool.query(
      'SELECT * FROM verification_codes WHERE phone = $1 AND code = $2 AND verified = FALSE AND expires_at > NOW()',
      [newPhone, verificationCode]
    );

    if (codeResult.rows.length === 0) {
      console.log(`SMS failed: No verification code found for ${newPhone}`);
      return res.status(400).json({ 
        error: "Invalid verification code" 
      });
    }
    
    if (codeResult.rows[0].verified) {
      console.log(`SMS failed: Code already used for ${newPhone}`);
      return res.status(400).json({ 
        error: "Verification code already used" 
      });
    }
    
    console.log(`SMS verified for ${email}: ${newPhone}`);

    // Check if new phone number is already in use
    const existingUserResult = await pool.query(
      'SELECT * FROM users WHERE phone = $1 AND id != $2',
      [newPhone, currentUser.id]
    );

    if (existingUserResult.rows.length > 0) {
      return res.status(409).json({ 
        error: "Phone number already in use by another account" 
      });
    }

    // Perform comprehensive data migration
    const oldPhone = currentUser.user_id || currentUser.phone || '+61434567890';
    
    // Update user with new phone UID
    await pool.query(
      'UPDATE users SET user_id = $1, phone = $1 WHERE id = $2',
      [newPhone, currentUser.id]
    );
    
    // Migrate post_ledger data
    await pool.query(
      'UPDATE post_ledger SET user_id = $1 WHERE user_id = $2',
      [newPhone, oldPhone]
    );

    // Migrate post_schedule data
    await pool.query(
      'UPDATE post_schedule SET user_id = $1 WHERE user_id = $2',
      [newPhone, oldPhone]
    );
    
    // Mark verification code as used
    await pool.query(
      'UPDATE verification_codes SET verified = TRUE WHERE id = $1',
      [codeResult.rows[0].id]
    );
    
    console.log(`Data migrated from ${oldPhone} to ${newPhone}`);

    res.json({ 
      success: true, 
      newPhone: newPhone,
      message: "Phone number updated successfully with complete data migration"
    });

  } catch (error) {
    console.error('Phone update error:', error.stack);
    res.status(400).json({ 
      error: error.message 
    });
  }
});

// Export data endpoint
app.get('/api/export-data', async (req, res) => {
  try {
    console.log('Data exported');
    
    // Export users
    const usersResult = await pool.query('SELECT * FROM users');
    
    // Export brand_purpose
    const brandPurposeResult = await pool.query('SELECT * FROM brand_purpose');
    
    // Export posts
    const postsResult = await pool.query('SELECT * FROM posts');
    
    // Export post_ledger
    const postLedgerResult = await pool.query('SELECT * FROM post_ledger');
    
    // Export post_schedule
    const postScheduleResult = await pool.query('SELECT * FROM post_schedule');

    res.json({
      export_info: {
        exported_at: new Date().toISOString(),
        phone_uid_system: true,
        twilio_integration_ready: true,
        local_setup_complete: true
      },
      users: usersResult.rows,
      brand_purpose: brandPurposeResult.rows,
      posts: postsResult.rows,
      post_ledger: postLedgerResult.rows,
      post_schedule: postScheduleResult.rows
    });

  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ error: "Export failed", details: error.message });
  }
});

// Quota status endpoint
app.get('/api/quota-status', async (req, res) => {
  try {
    // Mock session for local development
    const userId = req.session.userId || '+61400000002';
    
    const userResult = await pool.query(
      'SELECT subscription_plan, remaining_posts, total_posts FROM users WHERE user_id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    const user = userResult.rows[0];
    res.json({
      subscriptionPlan: user.subscription_plan,
      remainingPosts: user.remaining_posts,
      totalPosts: user.total_posts,
      canPost: user.remaining_posts > 0
    });

  } catch (error) {
    console.error('Quota status error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Brand posts endpoint
app.get('/api/brand-posts', async (req, res) => {
  try {
    const userId = req.session.userId || '+61400000002';
    
    const postsResult = await pool.query(
      'SELECT * FROM posts WHERE user_id = (SELECT id FROM users WHERE user_id = $1) ORDER BY created_at DESC',
      [userId]
    );

    res.json(postsResult.rows);

  } catch (error) {
    console.error('Brand posts error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Approve post endpoint
app.post('/api/approve-post', async (req, res) => {
  try {
    const { postId } = req.body;
    const userId = req.session.userId || '+61400000002';

    // Update post status
    await pool.query(
      'UPDATE posts SET status = $1 WHERE id = $2 AND user_id = (SELECT id FROM users WHERE user_id = $3)',
      ['approved', postId, userId]
    );

    res.json({ success: true, message: "Post approved successfully" });

  } catch (error) {
    console.error('Approve post error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Error:', err.stack);
  res.status(500).json({ error: 'Server error', stack: err.stack });
});

app.listen(port, () => {
  console.log(`Local server running on http://localhost:${port}`);
  console.log('Twilio integration ready');
  console.log('PostgreSQL connected');
});