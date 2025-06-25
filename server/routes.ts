import express from 'express';
import fs from 'fs';
import bcrypt from 'bcrypt';

const router = express.Router();

// Login endpoint with session handling
router.post('/auth/login', async (req, res) => {
  const { phone, password } = req.body;
  
  if (!phone || !password) {
    return res.status(400).json({
      "error": "Phone and password are required"
    });
  }

  try {
    // Use the new getUserByPhone function
    const { getUserByPhone } = await import('./storage');
    const user = await getUserByPhone(phone);
    
    console.log(`Login attempt for ${phone}, user found:`, !!user);
    
    if (!user) {
      console.log(`No user found for ${phone}`);
      return res.status(401).json({
        "error": "Invalid credentials"
      });
    }

    console.log(`User object:`, user);
    const { default: bcrypt } = await import('bcrypt');
    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    console.log(`Password validation result:`, isValidPassword);
    
    if (!isValidPassword) {
      return res.status(401).json({
        "error": "Invalid credentials"
      });
    }

    // Set session with callback to ensure completion
    if (req.session) {
      req.session.userId = user.id;
      req.session.userPhone = user.userId;
      req.session.subscriptionPlan = user.subscriptionPlan;
      
      // Use callback to ensure session is saved before responding
      req.session.save((err) => {
        if (err) {
          console.error('Session save error:', err);
          return res.status(500).json({
            "error": "Session error",
            "complete": false
          });
        }
        
        const timestamp = new Date().toLocaleString('en-AU', { 
          timeZone: 'Australia/Brisbane',
          hour12: true,
          year: 'numeric',
          month: '2-digit', 
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit'
        });
        
        console.log(`Login succeeded at ${timestamp} AEST`);
        res.json({
          "success": true,
          "complete": true,
          "timestamp": timestamp,
          "user": {
            "id": user.id,
            "phone": user.userId,
            "email": user.email,
            "subscriptionPlan": user.subscriptionPlan,
            "remainingPosts": user.remainingPosts
          }
        });
      });
    } else {
      const timestamp = new Date().toLocaleString('en-AU', { 
        timeZone: 'Australia/Brisbane',
        hour12: true,
        year: 'numeric',
        month: '2-digit', 
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
      
      console.log(`Login succeeded at ${timestamp} AEST`);
      res.json({
        "success": true,
        "complete": true,
        "timestamp": timestamp,
        "user": {
          "id": user.id,
          "phone": user.userId,
          "email": user.email,
          "subscriptionPlan": user.subscriptionPlan,
          "remainingPosts": user.remainingPosts
        }
      });
    }

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      "error": "Internal server error",
      "complete": false,
      "details": error.message
    });
  }
});

// Logout endpoint
router.post('/auth/logout', (req, res) => {
  if (req.session) {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({"error": "Could not log out"});
      }
      res.json({"success": true, "message": "Logged out successfully"});
    });
  } else {
    res.json({"success": true, "message": "Already logged out"});
  }
});

// Session check endpoint
router.get('/auth/session', (req, res) => {
  if (req.session?.userId) {
    res.json({
      "authenticated": true,
      "user": {
        "id": req.session.userId,
        "phone": req.session.userPhone,
        "subscriptionPlan": req.session.subscriptionPlan
      }
    });
  } else {
    res.json({"authenticated": false});
  }
});

// OAuth callback endpoint for all platforms
router.get('/oauth/callback', async (req, res) => {
  const { code, state, error } = req.query;
  const host = req.get('host');
  const baseUrl = process.env.REPLIT_DOMAINS ? `https://${process.env.REPLIT_DOMAINS.split(',')[0]}` : 
                  host?.includes('localhost') ? `http://${host}` : `https://${host}`;
  const platform = req.session?.oauthPlatform || 'unknown';
  
  console.log(`OAuth callback: platform=${platform}, code=${code}, state=${state}, error=${error}, url=${baseUrl}`);
  
  if (error || !code) {
    console.error(`OAuth callback failed for ${platform}:`, error);
    return res.status(400).json({
      "error": "OAuth callback failed",
      "details": { platform, code, state, error }
    });
  }

  try {
    let tokens = null;
    
    // Handle X platform OAuth 2.0
    if (platform === 'x' || platform === 'twitter') {
      const tokenResponse = await fetch('https://api.twitter.com/2/oauth2/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${Buffer.from(`${process.env.X_CLIENT_ID}:${process.env.X_CLIENT_SECRET}`).toString('base64')}`
        },
        body: new URLSearchParams({
          code: code.toString(),
          grant_type: 'authorization_code',
          client_id: process.env.X_CLIENT_ID || '',
          redirect_uri: `${baseUrl}/api/oauth/callback`,
          code_verifier: req.session?.codeVerifier || ''
        })
      });
      
      tokens = await tokenResponse.json();
      if (tokens.access_token) {
        process.env.X_ACCESS_TOKEN = tokens.access_token;
        process.env.X_REFRESH_TOKEN = tokens.refresh_token;
        console.log('X tokens updated successfully');
      }
    }
    
    // Handle Facebook OAuth 2.0
    else if (platform === 'facebook') {
      const tokenResponse = await fetch(`https://graph.facebook.com/v19.0/oauth/access_token?client_id=${process.env.FACEBOOK_APP_ID}&redirect_uri=${encodeURIComponent(baseUrl + '/api/oauth/callback')}&client_secret=${process.env.FACEBOOK_APP_SECRET}&code=${code}`);
      
      tokens = await tokenResponse.json();
      if (tokens.access_token) {
        process.env.FACEBOOK_ACCESS_TOKEN = tokens.access_token;
        console.log('Facebook tokens updated successfully');
      }
    }
    
    // Handle LinkedIn OAuth 2.0
    else if (platform === 'linkedin') {
      const tokenResponse = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code: code.toString(),
          client_id: process.env.LINKEDIN_CLIENT_ID || '',
          client_secret: process.env.LINKEDIN_CLIENT_SECRET || '',
          redirect_uri: `${baseUrl}/api/oauth/callback`
        })
      });
      
      tokens = await tokenResponse.json();
      if (tokens.access_token) {
        process.env.LINKEDIN_ACCESS_TOKEN = tokens.access_token;
        console.log('LinkedIn tokens updated successfully');
      }
    }
    
    // Save tokens to .env file for persistence
    if (tokens && tokens.access_token) {
      const envPath = '.env';
      let envContent = '';
      
      try {
        envContent = fs.readFileSync(envPath, 'utf8');
      } catch (err) {
        console.log('Creating new .env file');
      }
      
      // Update or add token entries
      const platformKey = platform.toUpperCase();
      const tokenKey = `${platformKey}_ACCESS_TOKEN`;
      const refreshKey = `${platformKey}_REFRESH_TOKEN`;
      
      if (envContent.includes(tokenKey)) {
        envContent = envContent.replace(new RegExp(`${tokenKey}=.*`), `${tokenKey}=${tokens.access_token}`);
      } else {
        envContent += `\n${tokenKey}=${tokens.access_token}`;
      }
      
      if (tokens.refresh_token) {
        if (envContent.includes(refreshKey)) {
          envContent = envContent.replace(new RegExp(`${refreshKey}=.*`), `${refreshKey}=${tokens.refresh_token}`);
        } else {
          envContent += `\n${refreshKey}=${tokens.refresh_token}`;
        }
      }
      
      fs.writeFileSync(envPath, envContent);
      console.log(`Tokens saved to .env for ${platform}`);
    }
    
    // Redirect to connection success page
    res.redirect(`/connect-platforms?success=${platform}`);
    
  } catch (err) {
    console.error(`OAuth token exchange failed for ${platform}:`, err);
    res.status(500).json({
      "error": "Token exchange failed",
      "platform": platform,
      "details": err.message
    });
  }
});

// Platform connection initiation endpoints
router.get('/auth/x', (req, res) => {
  const host = req.get('host');
  const baseUrl = process.env.REPLIT_DOMAINS ? `https://${process.env.REPLIT_DOMAINS.split(',')[0]}` : 
                  host?.includes('localhost') ? `http://${host}` : `https://${host}`;
  const codeVerifier = Buffer.from(Math.random().toString()).toString('base64').substring(0, 128);
  const codeChallenge = Buffer.from(codeVerifier).toString('base64url').substring(0, 43);
  
  if (req.session) {
    req.session.oauthPlatform = 'x';
    req.session.codeVerifier = codeVerifier;
  }
  
  const authUrl = `https://twitter.com/i/oauth2/authorize?response_type=code&client_id=${process.env.X_CLIENT_ID}&redirect_uri=${encodeURIComponent(baseUrl + '/api/oauth/callback')}&scope=tweet.read%20tweet.write%20users.read%20follows.read%20follows.write&state=x_auth&code_challenge=${codeChallenge}&code_challenge_method=S256`;
  
  console.log('X OAuth URL generated:', authUrl);
  console.log('Redirect URI:', baseUrl + '/api/oauth/callback');
  res.redirect(authUrl);
});

router.get('/auth/facebook', (req, res) => {
  const host = req.get('host');
  const baseUrl = process.env.REPLIT_DOMAINS ? `https://${process.env.REPLIT_DOMAINS.split(',')[0]}` : 
                  host?.includes('localhost') ? `http://${host}` : `https://${host}`;
  if (req.session) {
    req.session.oauthPlatform = 'facebook';
  }
  
  const authUrl = `https://www.facebook.com/v19.0/dialog/oauth?client_id=${process.env.FACEBOOK_APP_ID}&redirect_uri=${encodeURIComponent(baseUrl + '/api/oauth/callback')}&scope=pages_manage_posts,pages_read_engagement,publish_to_groups,user_posts&state=facebook_auth`;
  
  console.log('Facebook OAuth URL generated:', authUrl);
  console.log('Redirect URI:', baseUrl + '/api/oauth/callback');
  res.redirect(authUrl);
});

router.get('/auth/linkedin', (req, res) => {
  const host = req.get('host');
  const baseUrl = process.env.REPLIT_DOMAINS ? `https://${process.env.REPLIT_DOMAINS.split(',')[0]}` : 
                  host?.includes('localhost') ? `http://${host}` : `https://${host}`;
  if (req.session) {
    req.session.oauthPlatform = 'linkedin';
  }
  
  const authUrl = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${process.env.LINKEDIN_CLIENT_ID}&redirect_uri=${encodeURIComponent(baseUrl + '/api/oauth/callback')}&scope=w_member_social%20w_organization_social&state=linkedin_auth`;
  
  console.log('LinkedIn OAuth URL generated:', authUrl);
  console.log('Redirect URI:', baseUrl + '/api/oauth/callback');
  res.redirect(authUrl);
});

export default router;