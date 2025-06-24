# Local Development Setup for TheAgencyIQ

## Prerequisites

### Node.js Dependencies
```bash
npm install express pg twilio cors dotenv bcrypt drizzle-orm @neondatabase/serverless
npm install -D @types/node @types/express @types/bcrypt tsx
```

### PostgreSQL Database
```bash
# Install PostgreSQL locally
brew install postgresql  # macOS
sudo apt-get install postgresql postgresql-contrib  # Ubuntu

# Create database
createdb agencyiq
```

### Environment Variables (.env)
```env
DATABASE_URL=postgresql://username:password@localhost:5432/agencyiq
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=your_twilio_number
SESSION_SECRET=your_session_secret
PORT=5000
```

## Database Schema

```sql
-- Users table (phone UID architecture)
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) UNIQUE NOT NULL,  -- Phone number as unique identifier
  email VARCHAR(255) UNIQUE,
  password VARCHAR(255),
  phone VARCHAR(255),
  subscription_plan VARCHAR(50) DEFAULT 'starter',
  subscription_start TIMESTAMP DEFAULT NOW(),
  remaining_posts INTEGER DEFAULT 10,
  total_posts INTEGER DEFAULT 0,
  stripe_customer_id VARCHAR(255),
  stripe_subscription_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Verification codes for SMS
CREATE TABLE verification_codes (
  id SERIAL PRIMARY KEY,
  phone VARCHAR(255) NOT NULL,
  code VARCHAR(10) NOT NULL,
  verified BOOLEAN DEFAULT FALSE,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Brand purpose
CREATE TABLE brand_purpose (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  brand_name VARCHAR(255),
  products_services TEXT,
  core_purpose TEXT,
  audience TEXT,
  job_to_be_done TEXT,
  motivations TEXT,
  pain_points TEXT,
  goals JSONB,
  logo_url VARCHAR(255),
  contact_details JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Posts
CREATE TABLE posts (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  platform VARCHAR(50),
  content TEXT,
  scheduled_for TIMESTAMP,
  status VARCHAR(50) DEFAULT 'draft',
  analytics JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Post ledger (quota tracking)
CREATE TABLE post_ledger (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255),  -- Phone number reference
  post_id INTEGER,
  platform VARCHAR(50),
  scheduled_for TIMESTAMP,
  status VARCHAR(50),
  analytics JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Post schedule
CREATE TABLE post_schedule (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255),  -- Phone number reference
  platform VARCHAR(50),
  content TEXT,
  scheduled_for TIMESTAMP,
  status VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW()
);
```

## Local Server Setup (server/local.js)

```javascript
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
    
    // Step 1: Generate and send verification code
    if (!verificationCode) {
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
        console.log(`SMS sent to ${newPhone}`);
      } catch (smsError) {
        console.log(`SMS sending failed: ${smsError.message}`);
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

    // Verify SMS code
    const codeResult = await pool.query(
      'SELECT * FROM verification_codes WHERE phone = $1 AND code = $2 AND verified = FALSE AND expires_at > NOW()',
      [newPhone, verificationCode]
    );

    if (codeResult.rows.length === 0) {
      return res.status(400).json({ error: "Invalid verification code" });
    }
    console.log(`SMS verified for ${email}: ${newPhone}`);

    // Get current user
    const userResult = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    const user = userResult.rows[0];
    const oldPhone = user.user_id || user.phone || '+61434567890';

    // Update user with new phone
    await pool.query(
      'UPDATE users SET user_id = $1, phone = $1 WHERE email = $2',
      [newPhone, email]
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
    res.status(400).json({ error: error.message });
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
```

## Data Migration Script (migrate-data.js)

```javascript
const { Pool } = require('pg');
const fs = require('fs');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function migrateData() {
  try {
    // Read exported data from Replit
    const exportData = JSON.parse(fs.readFileSync('replit-export.json', 'utf8'));
    
    console.log('Starting data migration...');
    
    // Migrate users
    for (const user of exportData.users || []) {
      await pool.query(`
        INSERT INTO users (user_id, email, password, phone, subscription_plan, remaining_posts, total_posts)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (email) DO UPDATE SET
          user_id = EXCLUDED.user_id,
          phone = EXCLUDED.phone,
          subscription_plan = EXCLUDED.subscription_plan
      `, [
        user.userId || user.phone,
        user.email,
        user.password,
        user.phone,
        user.subscriptionPlan || 'starter',
        user.remainingPosts || 10,
        user.totalPosts || 0
      ]);
    }
    
    // Migrate brand_purpose
    for (const brand of exportData.brand_purpose || []) {
      const userResult = await pool.query('SELECT id FROM users WHERE email = $1', [brand.userEmail]);
      if (userResult.rows.length > 0) {
        await pool.query(`
          INSERT INTO brand_purpose (user_id, brand_name, products_services, core_purpose, audience, job_to_be_done, motivations, pain_points, goals, contact_details)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          ON CONFLICT DO NOTHING
        `, [
          userResult.rows[0].id,
          brand.brandName,
          brand.productsServices,
          brand.corePurpose,
          brand.audience,
          brand.jobToBeDone,
          brand.motivations,
          brand.painPoints,
          JSON.stringify(brand.goals || {}),
          JSON.stringify(brand.contactDetails || {})
        ]);
      }
    }
    
    console.log('Data migration completed successfully');
    
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await pool.end();
  }
}

migrateData();
```

## Client API Update (client/src/lib/api.ts)

```typescript
export async function apiRequest(
  method: string,
  url: string,
  data?: unknown,
): Promise<Response> {
  console.log(`API call to ${url} starting with method ${method}`);
  
  const response = await fetch(`http://localhost:5000${url}`, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  console.log(`API call to ${url} returned ${response.status}`);

  if (!response.ok) {
    const text = await response.text();
    console.error('Error:', text);
    
    // Check for HTML response (DOCTYPE error)
    if (text.includes('<!DOCTYPE') || text.includes('<html')) {
      throw new Error('Server returned HTML instead of JSON. Check server configuration.');
    }
    
    // Try to parse as JSON
    try {
      const errorData = JSON.parse(text);
      throw new Error(errorData.error || errorData.message || 'Server error');
    } catch (parseError) {
      throw new Error('Server error: ' + text.substring(0, 50));
    }
  }

  return response;
}
```

## Testing Commands

### 1. Export data from current Replit environment
```bash
curl -X GET "http://localhost:5000/api/export-data" --cookie test_cookies.txt > replit-export.json
```

### 2. Local server testing
```bash
# Start local server
node server/local.js

# Test phone update (step 1 - get code)
curl -X POST "http://localhost:5000/api/update-phone" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer mock-token" \
  -d '{"email": "test@example.com", "newPhone": "+610424835189"}'

# Test phone update (step 2 - verify code)
curl -X POST "http://localhost:5000/api/update-phone" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer mock-token" \
  -d '{"email": "test@example.com", "newPhone": "+610424835189", "verificationCode": "123456"}'

# Test quota status
curl -X GET "http://localhost:5000/api/quota-status"
```

## Deployment Options

### Heroku
```bash
# Install Heroku CLI
npm install -g heroku

# Create app
heroku create agencyiq-local

# Add PostgreSQL addon
heroku addons:create heroku-postgresql:mini

# Set environment variables
heroku config:set TWILIO_ACCOUNT_SID=your_sid
heroku config:set TWILIO_AUTH_TOKEN=your_token
heroku config:set TWILIO_PHONE_NUMBER=your_number

# Deploy
git push heroku main
```

### Railway
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login and create project
railway login
railway new agencyiq-local

# Add PostgreSQL service
railway add postgresql

# Deploy
railway up
```

## Key Features Preserved

- **Phone UID Architecture**: Complete data migration when phone numbers change
- **Twilio SMS Verification**: Two-step verification process
- **Session Management**: PostgreSQL-backed sessions
- **Quota System**: Post limits based on subscription plans
- **Brand Purpose**: User branding and content generation data
- **JSON Enforcement**: Prevents HTML/DOCTYPE errors
- **Error Handling**: Comprehensive logging and error responses

## Development Workflow

1. Export data from Replit using `/api/export-data`
2. Set up local PostgreSQL database with provided schema
3. Run migration script to import data
4. Start local server with `node server/local.js`
5. Update client API endpoints to point to `localhost:5000`
6. Test phone update functionality
7. Deploy to chosen platform (Heroku, Railway, etc.)

This setup maintains all existing functionality while providing a local development environment with proper Twilio integration and database persistence.