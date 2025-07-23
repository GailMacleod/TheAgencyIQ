import { GoogleAuth } from 'google-auth-library';
import axios from 'axios';
import { storage } from '../storage';

interface VeoVideoRequest {
  prompt: string;
  brandPurpose?: string;
  businessName?: string;
  location?: string;
  aspectRatio?: '16:9' | '9:16' | '1:1';
  duration?: number;
  style?: 'cinematic' | 'documentary' | 'commercial' | 'lifestyle';
}

interface VeoVideoJob {
  name: string;
  state: 'PENDING' | 'RUNNING' | 'SUCCEEDED' | 'FAILED';
  videoUri?: string;
  error?: string;
}

export class VeoVideoService {
  private auth: GoogleAuth;
  private projectId: string;
  private location: string = 'us-central1';

  constructor() {
    if (!process.env.GOOGLE_PROJECT_ID) {
      throw new Error('GOOGLE_PROJECT_ID environment variable is required');
    }
    
    this.projectId = process.env.GOOGLE_PROJECT_ID;
    
    // Initialize Google Auth with service account credentials
    this.auth = new GoogleAuth({
      credentials: {
        type: 'service_account',
        project_id: process.env.GOOGLE_PROJECT_ID,
        private_key_id: process.env.GOOGLE_PRIVATE_KEY_ID,
        private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        client_id: process.env.GOOGLE_CLIENT_ID,
        token_uri: 'https://oauth2.googleapis.com/token'
      },
      scopes: ['https://www.googleapis.com/auth/cloud-platform']
    });
  }

  private async getAccessToken(): Promise<string> {
    const client = await this.auth.getClient();
    const tokenResponse = await client.getAccessToken();
    
    if (!tokenResponse.token) {
      throw new Error('Failed to obtain access token');
    }
    
    return tokenResponse.token;
  }

  private createCinematicPrompt(request: VeoVideoRequest): string {
    const { prompt, brandPurpose, businessName, location } = request;
    
    // Enhanced Queensland-focused cinematic prompt
    const cinematicElements = [
      'Cinematic 4K quality, professional color grading',
      'Golden hour lighting with warm, inviting tones',
      'Smooth camera movements, establishing shots transitioning to close-ups',
      'Australian landscape elements subtly integrated',
      'Professional business setting with authentic human interactions'
    ];

    const queenslandContext = location?.toLowerCase().includes('queensland') || location?.toLowerCase().includes('qld') 
      ? `Set in beautiful Queensland, Australia with iconic Australian elements like golden sunlight, blue skies, and modern business districts.`
      : `Set in a professional Australian business environment with warm, inviting atmosphere.`;

    const brandIntegration = brandPurpose 
      ? `The video should reflect the brand purpose: "${brandPurpose}" through visual storytelling that connects emotionally with Queensland small business owners.`
      : '';

    const businessContext = businessName 
      ? `Feature ${businessName} in a way that showcases professionalism, trust, and local Queensland community connection.`
      : '';

    return `
${cinematicElements.join('. ')}

${queenslandContext}

Core Video Content: ${prompt}

${brandIntegration}

${businessContext}

Style Requirements:
- Cinematic depth of field with professional bokeh effects
- Orchestral background music that builds emotion
- Natural, authentic performances avoiding overly staged presentations
- Queensland small business aesthetic - approachable yet professional
- Color palette reflecting Australian warmth and optimism
- Smooth transitions that maintain viewer engagement
- 30-60 second duration optimized for social media engagement

Technical Specifications:
- 4K resolution with cinematic 24fps feel
- Professional lighting setup with natural shadow play
- Audio mix optimized for social media platforms
- Captions-ready composition for accessibility
    `.trim();
  }

  async generateVideo(request: VeoVideoRequest): Promise<{ jobId: string; estimatedTime: string }> {
    try {
      console.log(`🎬 Starting VEO video generation`);
      console.log(`📝 Original prompt: ${request.prompt}`);
      
      // Use provided context or defaults
      request.brandPurpose = request.brandPurpose || 'Helping Queensland businesses succeed';
      request.businessName = request.businessName || 'Queensland Business';
      request.location = request.location || 'Queensland, Australia';

      const accessToken = await this.getAccessToken();
      const cinematicPrompt = this.createCinematicPrompt(request);
      
      console.log(`🎨 Enhanced cinematic prompt created (${cinematicPrompt.length} chars)`);

      const requestBody = {
        displayName: `TheAgencyIQ Video - ${request.businessName || 'Queensland SME'} - ${Date.now()}`,
        description: `Cinematic video for Queensland small business featuring: ${request.prompt}`,
        inputSpecs: [
          {
            inputType: 'TEXT',
            textInput: {
              text: cinematicPrompt
            }
          }
        ],
        outputSpecs: [
          {
            outputType: 'VIDEO',
            videoOutput: {
              aspectRatio: request.aspectRatio || '16:9',
              frameRate: 24,
              duration: `${request.duration || 30}s`
            }
          }
        ],
        model: 'veo-001'
      };

      const response = await axios.post(
        `https://aiplatform.googleapis.com/v1/projects/${this.projectId}/locations/${this.location}/publishers/google/models/veo-001:generateContent`,
        requestBody,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      );

      const jobId = response.data.name || `veo_${Date.now()}_${userId}`;
      
      console.log(`✅ VEO video generation job created: ${jobId}`);
      
      // Store job info in database for tracking
      await this.storeVideoJob(userId, jobId, request);

      return {
        jobId,
        estimatedTime: '2-5 minutes'
      };

    } catch (error: any) {
      console.error('❌ VEO video generation failed:', error);
      console.error('Response data:', error.response?.data);
      
      throw new Error(`Video generation failed: ${error.message}`);
    }
  }

  async checkVideoStatus(jobId: string): Promise<VeoVideoJob> {
    try {
      const accessToken = await this.getAccessToken();
      
      const response = await axios.get(
        `https://aiplatform.googleapis.com/v1/${jobId}`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const job = response.data;
      
      return {
        name: jobId,
        state: job.state || 'PENDING',
        videoUri: job.response?.candidates?.[0]?.content?.parts?.[0]?.videoMetadata?.videoUri,
        error: job.error?.message
      };

    } catch (error: any) {
      console.error(`❌ Failed to check video status for ${jobId}:`, error);
      
      return {
        name: jobId,
        state: 'FAILED',
        error: error.message
      };
    }
  }

  async downloadVideo(videoUri: string): Promise<Buffer> {
    try {
      const accessToken = await this.getAccessToken();
      
      const response = await axios.get(videoUri, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        },
        responseType: 'arraybuffer'
      });

      return Buffer.from(response.data);
      
    } catch (error: any) {
      console.error('❌ Failed to download video:', error);
      throw new Error(`Video download failed: ${error.message}`);
    }
  }

  private async storeVideoJob(userId: string, jobId: string, request: VeoVideoRequest): Promise<void> {
    try {
      // This would typically store in your video_jobs table
      console.log(`📝 Storing video job ${jobId} for user ${userId}`);
      // Implementation depends on your database schema
    } catch (error) {
      console.error('Failed to store video job:', error);
      // Non-critical error, don't throw
    }
  }

  async getJobHistory(userId: string): Promise<any[]> {
    try {
      // Retrieve user's video generation history
      console.log(`📋 Retrieving video history for user ${userId}`);
      // Implementation depends on your database schema
      return [];
    } catch (error) {
      console.error('Failed to retrieve job history:', error);
      return [];
    }
  }
}

export const veoVideoService = new VeoVideoService();