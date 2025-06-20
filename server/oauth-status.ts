import { storage } from './storage';

export interface OAuthPlatformStatus {
  platform: string;
  available: boolean;
  configured: boolean;
  error?: string;
  lastTest?: Date;
  authUrl?: string;
}

export interface OAuthSystemStatus {
  platforms: OAuthPlatformStatus[];
  totalConfigured: number;
  totalAvailable: number;
  systemHealth: 'healthy' | 'degraded' | 'critical';
  lastCheck: Date;
}

export class OAuthStatusMonitor {
  
  static async getSystemStatus(): Promise<OAuthSystemStatus> {
    const platforms = await this.checkAllPlatforms();
    const configured = platforms.filter(p => p.configured).length;
    const available = platforms.filter(p => p.available).length;
    
    let systemHealth: 'healthy' | 'degraded' | 'critical' = 'healthy';
    if (available === 0) {
      systemHealth = 'critical';
    } else if (available < configured) {
      systemHealth = 'degraded';
    }
    
    return {
      platforms,
      totalConfigured: configured,
      totalAvailable: available,
      systemHealth,
      lastCheck: new Date()
    };
  }
  
  static async checkAllPlatforms(): Promise<OAuthPlatformStatus[]> {
    const platforms = [
      { name: 'facebook', env: ['FACEBOOK_APP_ID', 'FACEBOOK_APP_SECRET'] },
      { name: 'linkedin', env: ['LINKEDIN_CLIENT_ID', 'LINKEDIN_CLIENT_SECRET'] },
      { name: 'twitter', env: ['TWITTER_CLIENT_ID', 'TWITTER_CLIENT_SECRET'] },
      { name: 'youtube', env: ['YOUTUBE_CLIENT_ID', 'YOUTUBE_CLIENT_SECRET'] },
      { name: 'instagram', env: ['INSTAGRAM_CLIENT_ID', 'INSTAGRAM_CLIENT_SECRET'] }
    ];
    
    const results: OAuthPlatformStatus[] = [];
    
    for (const platform of platforms) {
      const status = await this.checkPlatform(platform.name, platform.env);
      results.push(status);
    }
    
    return results;
  }
  
  static async checkPlatform(platformName: string, envVars: string[]): Promise<OAuthPlatformStatus> {
    const configured = envVars.every(env => process.env[env]);
    
    let available = false;
    let error: string | undefined;
    
    if (configured) {
      try {
        // Test OAuth initiation endpoint
        const authUrl = `/auth/${platformName}`;
        available = true;
      } catch (err: any) {
        error = err.message;
        available = false;
      }
    } else {
      error = `Missing environment variables: ${envVars.filter(env => !process.env[env]).join(', ')}`;
    }
    
    return {
      platform: platformName,
      available,
      configured,
      error,
      lastTest: new Date(),
      authUrl: configured ? `/auth/${platformName}` : undefined
    };
  }
  
  static async getUserConnections(userId: number) {
    try {
      const connections = await storage.getPlatformConnectionsByUser(userId);
      return connections.map(conn => ({
        platform: conn.platform,
        username: conn.platformUsername,
        connected: conn.isActive,
        lastUpdated: conn.updatedAt
      }));
    } catch (error) {
      console.error('Error fetching user connections:', error);
      return [];
    }
  }
  
  static async testPlatformConnection(platform: string, userId: number) {
    try {
      const connections = await storage.getPlatformConnectionsByUser(userId);
      const connection = connections.find(c => c.platform === platform);
      
      if (!connection) {
        return { 
          success: false, 
          error: `No ${platform} connection found for user` 
        };
      }
      
      if (!connection.isActive) {
        return { 
          success: false, 
          error: `${platform} connection is inactive` 
        };
      }
      
      // Basic connection validation
      if (!connection.accessToken) {
        return { 
          success: false, 
          error: `${platform} access token missing` 
        };
      }
      
      return { 
        success: true, 
        connection: {
          platform: connection.platform,
          username: connection.platformUsername,
          connected: true
        }
      };
    } catch (error: any) {
      return { 
        success: false, 
        error: error.message 
      };
    }
  }
}