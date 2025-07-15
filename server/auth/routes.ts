import { Router } from 'express';
import { createUser, authenticateUser } from './signup';
import { z } from 'zod';

const router = Router();

// Signup route
router.post('/signup', async (req, res) => {
  try {
    const { email, password, phone } = req.body;
    
    // Validate input
    const signupData = {
      email,
      password,
      userId: phone || email, // Use phone as userId, fallback to email
      phone,
    };
    
    const user = await createUser(signupData);
    
    // Set session
    req.session.userId = user.id;
    req.session.save((err) => {
      if (err) {
        console.error('Session save error:', err);
        return res.status(500).json({ error: 'Session creation failed' });
      }
      
      res.json({ 
        success: true, 
        user,
        message: 'User created successfully' 
      });
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(400).json({ 
      error: error instanceof Error ? error.message : 'Signup failed' 
    });
  }
});

// Login route
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    
    const user = await authenticateUser(email, password);
    
    // Set session
    req.session.userId = user.id;
    req.session.save((err) => {
      if (err) {
        console.error('Session save error:', err);
        return res.status(500).json({ error: 'Session creation failed' });
      }
      
      res.json({ 
        success: true, 
        user,
        message: 'Login successful' 
      });
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(401).json({ 
      error: error instanceof Error ? error.message : 'Login failed' 
    });
  }
});

// Logout route
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Logout error:', err);
      return res.status(500).json({ error: 'Logout failed' });
    }
    
    res.json({ success: true, message: 'Logged out successfully' });
  });
});

// Check authentication status
router.get('/status', (req, res) => {
  if (req.session.userId) {
    res.json({ 
      authenticated: true, 
      userId: req.session.userId 
    });
  } else {
    res.json({ authenticated: false });
  }
});

export default router;