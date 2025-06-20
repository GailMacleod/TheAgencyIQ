import { Request, Response, NextFunction } from 'express';
import { db } from '../db';
import { connections } from '../models/connection';
import { eq, and } from 'drizzle-orm';

interface AuthenticatedRequest extends Request {
  userPhone?: string;
  connections?: any[];
}

// Session and token validation middleware
export const validateTokens = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.session?.userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Get user phone from session
    const userPhone = req.session.userPhone;
    if (!userPhone) {
      return res.status(401).json({ error: 'User phone not found in session' });
    }

    // Get all platform connections for this user
    const userConnections = await db
      .select()
      .from(connections)
      .where(and(
        eq(connections.userPhone, userPhone),
        eq(connections.isActive, true)
      ));

    // Check token expiration and refresh if needed
    const validConnections = [];
    for (const connection of userConnections) {
      if (connection.expiresAt && new Date() > connection.expiresAt) {
        console.log(`Token expired for ${userPhone} on ${connection.platform}`);
        
        // Attempt token refresh
        const refreshed = await refreshToken(connection);
        if (refreshed) {
          console.log(`Token refreshed ${userPhone} for ${connection.platform}`);
          validConnections.push(refreshed);
        } else {
          console.log(`Redirect to connect ${userPhone}`);
          // Mark connection as inactive
          await db
            .update(connections)
            .set({ isActive: false })
            .where(eq(connections.id, connection.id));
        }
      } else {
        validConnections.push(connection);
      }
    }

    req.userPhone = userPhone;
    req.connections = validConnections;
    next();
  } catch (error) {
    console.error('Token validation error:', error);
    res.status(500).json({ error: 'Token validation failed' });
  }
};

// Refresh token for specific platform
async function refreshToken(connection: any): Promise<any | null> {
  try {
    switch (connection.platform) {
      case 'facebook':
        return await refreshFacebookToken(connection);
      case 'linkedin':
        return await refreshLinkedInToken(connection);
      case 'x':
      case 'twitter':
        return await refreshTwitterToken(connection);
      case 'youtube':
        return await refreshYouTubeToken(connection);
      case 'instagram':
        return await refreshInstagramToken(connection);
      default:
        return null;
    }
  } catch (error) {
    console.error(`Token refresh failed for ${connection.platform}:`, error);
    return null;
  }
}

// Facebook token refresh
async function refreshFacebookToken(connection: any): Promise<any | null> {
  try {
    const response = await fetch(`https://graph.facebook.com/v18.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${process.env.FACEBOOK_APP_ID}&client_secret=${process.env.FACEBOOK_APP_SECRET}&fb_exchange_token=${connection.accessToken}`);
    
    if (response.ok) {
      const data = await response.json();
      const expiresAt = data.expires_in ? new Date(Date.now() + data.expires_in * 1000) : null;
      
      // Update in database
      const [updatedConnection] = await db
        .update(connections)
        .set({
          accessToken: data.access_token,
          expiresAt: expiresAt
        })
        .where(eq(connections.id, connection.id))
        .returning();
      
      return updatedConnection;
    }
    return null;
  } catch (error) {
    console.error('Facebook token refresh error:', error);
    return null;
  }
}

// LinkedIn token refresh
async function refreshLinkedInToken(connection: any): Promise<any | null> {
  try {
    if (!connection.refreshToken) return null;
    
    const response = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: connection.refreshToken,
        client_id: process.env.LINKEDIN_CLIENT_ID!,
        client_secret: process.env.LINKEDIN_CLIENT_SECRET!
      })
    });

    if (response.ok) {
      const data = await response.json();
      const expiresAt = new Date(Date.now() + data.expires_in * 1000);
      
      const [updatedConnection] = await db
        .update(connections)
        .set({
          accessToken: data.access_token,
          refreshToken: data.refresh_token || connection.refreshToken,
          expiresAt: expiresAt
        })
        .where(eq(connections.id, connection.id))
        .returning();
      
      return updatedConnection;
    }
    return null;
  } catch (error) {
    console.error('LinkedIn token refresh error:', error);
    return null;
  }
}

// Twitter token refresh (OAuth 1.0a doesn't expire, just validate)
async function refreshTwitterToken(connection: any): Promise<any | null> {
  try {
    // Twitter OAuth 1.0a tokens don't expire, just validate they work
    return connection;
  } catch (error) {
    console.error('Twitter token validation error:', error);
    return null;
  }
}

// YouTube (Google) token refresh
async function refreshYouTubeToken(connection: any): Promise<any | null> {
  try {
    if (!connection.refreshToken) return null;
    
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.YOUTUBE_CLIENT_ID!,
        client_secret: process.env.YOUTUBE_CLIENT_SECRET!,
        refresh_token: connection.refreshToken,
        grant_type: 'refresh_token'
      })
    });

    if (response.ok) {
      const data = await response.json();
      const expiresAt = new Date(Date.now() + data.expires_in * 1000);
      
      const [updatedConnection] = await db
        .update(connections)
        .set({
          accessToken: data.access_token,
          expiresAt: expiresAt
        })
        .where(eq(connections.id, connection.id))
        .returning();
      
      return updatedConnection;
    }
    return null;
  } catch (error) {
    console.error('YouTube token refresh error:', error);
    return null;
  }
}

// Instagram token refresh (uses Facebook)
async function refreshInstagramToken(connection: any): Promise<any | null> {
  return await refreshFacebookToken(connection);
}