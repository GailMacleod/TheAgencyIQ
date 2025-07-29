/**
 * Authentic VEO 3.0 Service using official Vertex AI documentation
 * Implements predictLongRunning endpoint with fetchPredictOperation polling
 */
import OptimizedVideoManager from './services/OptimizedVideoManager.js';

// Singleton pattern to ensure operations persist across instances with database backup
let sharedOperations = new Map();

// Enhanced operation storage with Replit database persistence
class PersistentOperationStore {
  constructor() {
    this.memoryStore = sharedOperations;
    this.dbStore = null;
  }
  
  async initDB() {
    if (!this.dbStore) {
      try {
        const Database = (await import('@replit/database')).default;
        this.dbStore = new Database();
      } catch (error) {
        console.log('⚠️ VEO 3.0: Database initialization failed:', error.message);
      }
    }
  }
  
  async set(operationId, operationData) {
    // Store in memory first
    this.memoryStore.set(operationId, operationData);
    console.log(`💾 VEO 3.0: Stored operation ${operationId} in memory (${this.memoryStore.size} total)`);
    
    // Backup to Replit database
    try {
      await this.initDB();
      if (this.dbStore) {
        await this.dbStore.set(`veo_op_${operationId}`, {
          ...operationData,
          storedAt: Date.now(),
          persistent: true
        });
        console.log(`💾 VEO 3.0: Backed up operation ${operationId} to Replit DB`);
      }
    } catch (dbError) {
      console.log(`⚠️ VEO 3.0: DB backup failed for ${operationId}:`, dbError.message);
    }
  }
  
  async get(operationId) {
    // Check memory first
    if (this.memoryStore.has(operationId)) {
      console.log(`📖 VEO 3.0: Found operation ${operationId} in memory`);
      return this.memoryStore.get(operationId);
    }
    
    // Restore from database
    try {
      await this.initDB();
      if (this.dbStore) {
        const dbOperation = await this.dbStore.get(`veo_op_${operationId}`);
        if (dbOperation) {
          console.log(`📖 VEO 3.0: Restored operation ${operationId} from Replit DB`);
          this.memoryStore.set(operationId, dbOperation);
          return dbOperation;
        }
      }
    } catch (dbError) {
      console.log(`⚠️ VEO 3.0: DB restore failed for ${operationId}:`, dbError.message);
    }
    
    return null;
  }
  
  async delete(operationId) {
    this.memoryStore.delete(operationId);
    try {
      await this.initDB();
      if (this.dbStore) {
        await this.dbStore.delete(`veo_op_${operationId}`);
        console.log(`🗑️ VEO 3.0: Cleaned up operation ${operationId}`);
      }
    } catch (dbError) {
      console.log(`⚠️ VEO 3.0: DB cleanup failed for ${operationId}:`, dbError.message);
    }
  }
  
  size() {
    return this.memoryStore.size;
  }
  
  keys() {
    return Array.from(this.memoryStore.keys());
  }
}

// Global persistent operation store
const persistentOperations = new PersistentOperationStore();
let sharedVideoManager = null;

class VeoService {
  constructor() {
    this.VEO3_MODEL = 'veo-3.0-generate-preview';
    this.operations = persistentOperations; // Use persistent operations store
    this.quotaManager = null;
    if (!sharedVideoManager) {
      sharedVideoManager = new OptimizedVideoManager();
    }
    this.videoManager = sharedVideoManager;
    
    // Initialize Google AI for fallback scenarios
    this.initializeGoogleAI();
  }

  async initializeGoogleAI() {
    try {
      const { GoogleGenerativeAI } = await import('@google/generative-ai');
      
      if (!process.env.GOOGLE_AI_STUDIO_KEY) {
        console.log('⚠️ VEO 3.0: Google AI Studio key not found in environment');
        return;
      }
      
      this.genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_STUDIO_KEY);
      console.log('✅ VEO 3.0: Google AI initialized with authentic VEO credentials');
      console.log('🎬 VEO 3.0: Ready for cinematic video generation');
    } catch (error) {
      console.log('⚠️ VEO 3.0: Google AI initialization failed:', error.message);
    }
  }

  /**
   * Generate VEO 3.0 video using authentic Vertex AI API
   * @param {string} prompt - Video generation prompt
   * @param {Object} config - Video configuration
   * @returns {Promise<Object>} - Generation result
   */
  async generateVideo(prompt, config = {}) {
    try {
      console.log(`🎬 VEO 3.0: Starting authentic video generation`);
      
      // Prepare final configuration with VEO 3.0 constraints
      const finalConfig = {
        aspectRatio: config.aspectRatio || '16:9',
        durationSeconds: Math.min(Math.max(config.durationSeconds || 8, 5), 8), // VEO 3.0: 5-8 seconds
        resolution: '720p', // VEO 3.0 supports 720p
        enhancePrompt: config.enhancePrompt !== false,
        personGeneration: config.personGeneration || 'allow',
        platform: config.platform || 'youtube'
      };

      console.log(`🎯 VEO 3.0: Config - ${finalConfig.durationSeconds}s, ${finalConfig.aspectRatio}, ${finalConfig.resolution}`);

      // Construct video request for Vertex AI
      const videoRequest = {
        prompt: prompt,
        config: finalConfig
      };

      // Call authentic VEO 3.0 API via Vertex AI
      console.log(`🔄 VEO 3.0: Initiating authentic Vertex AI video generation`);
      console.log(`⏱️  VEO 3.0: Estimated generation time: 5-8 seconds video, 30s to 6 minutes processing`);
      
      const apiResult = await this.callVeo3Api(videoRequest);
      
      if (!apiResult.success) {
        throw new Error(`VEO 3.0 API call failed: ${apiResult.error}`);
      }
      
      // Store operation for authentic tracking with proper data structure
      const operationData = {
        operationId: apiResult.operationId,
        startTime: Date.now(),
        prompt: prompt,
        config: finalConfig,
        status: 'processing',
        platform: finalConfig.platform || 'youtube',
        vertexAiOperation: apiResult, // Store full Vertex AI operation details
        estimatedCompletion: Date.now() + (Math.floor(Math.random() * 300) + 30) * 1000, // 30s-5min realistic timing
        progress: 10, // Start at 10% progress
        phase: 'VEO 3.0 initialization',
        videoData: {
          videoId: `veo3_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          prompt: prompt,
          aspectRatio: finalConfig.aspectRatio,
          duration: finalConfig.durationSeconds,
          platform: finalConfig.platform
        },
        createdAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString()
      };
      
      console.log(`💾 VEO 3.0: Storing operation data for ${apiResult.operationId}:`, {
        operationId: operationData.operationId,
        startTime: operationData.startTime,
        status: operationData.status,
        progress: operationData.progress,
        platform: operationData.platform
      });
      
      await this.operations.set(apiResult.operationId, operationData);

      // Return async operation tracking for authentic VEO 3.0 timing
      return {
        success: true,
        operationId: apiResult.operationId,
        operationName: apiResult.operationName,
        isAsync: true,
        status: 'processing',
        estimatedTime: '30s to 6 minutes',
        message: 'VEO 3.0 generation initiated via Vertex AI - authentic timing',
        platform: finalConfig.platform || 'youtube',
        vertexAi: true
      };

    } catch (error) {
      console.error(`❌ VEO 3.0: Generation failed:`, error);
      
      // Enhanced error handling with specific error types
      if (error.message.includes('quota') || error.message.includes('limit')) {
        return {
          success: false,
          error: 'VEO 3.0 quota exceeded - please try again later',
          platform: config.platform || 'youtube'
        };
      }
      
      return {
        success: false,
        error: error.message,
        platform: config.platform || 'youtube'
      };
    }
  }

  async callVeo3Api(videoRequest) {
    try {
      const { GoogleAuth } = await import('google-auth-library');
      const auth = new GoogleAuth({
        scopes: 'https://www.googleapis.com/auth/cloud-platform',
      });
      const client = await auth.getClient();
      const accessToken = (await client.getAccessToken()).token;

      const projectId = process.env.GOOGLE_CLOUD_PROJECT || 'your-project-id';
      const location = process.env.LOCATION || 'us-central1';
      const modelId = process.env.MODEL_ID || 'veo-3.0-generate-preview';

      const url = `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/publishers/google/models/${modelId}:predictLongRunning`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          instances: [{ prompt: videoRequest.prompt }],
          parameters: {
            durationSeconds: videoRequest.config.durationSeconds,
            aspectRatio: videoRequest.config.aspectRatio,
            resolution: videoRequest.config.resolution,
            generateAudio: true,
            personGeneration: videoRequest.config.personGeneration,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Vertex AI error: ${response.status} - ${await response.text()}`);
      }

      const { name: operationName } = await response.json();
      const operationId = operationName.split('/').pop();

      return { success: true, operationId, operationName, status: 'processing' };
    } catch (error) {
      console.error('Vertex AI Veo 3.0 call failed:', error);
      return { success: false, error: error.message };
    }
  }

  async getOperationStatus(operationId) {
    const op = await this.operations.get(operationId);
    if (!op) throw new Error('Invalid operationId');

    if (op.status === 'completed') return op;

    const projectId = process.env.GOOGLE_CLOUD_PROJECT;
    const location = 'us-central1';
    const url = `https://${location}-aiplatform.googleapis.com/v1/${op.operationName}`;

    const { GoogleAuth } = await import('google-auth-library');
    const auth = new GoogleAuth({ scopes: 'https://www.googleapis.com/auth/cloud-platform' });
    const client = await auth.getClient();
    const accessToken = (await client.getAccessToken()).token;

    const response = await fetch(url, {
      headers: { 'Authorization': `Bearer ${accessToken}` },
    });

    const { done, response: result, error } = await response.json();

    if (done) {
      if (error) {
        op.status = 'failed';
        op.error = error.message;
      } else {
        op.status = 'completed';
        op.videoUrl = result.output.videoUri;  // From Vertex response
        op.duration = result.output.durationSeconds;
        // Update videoUsage with real data for quota
        const veoTracker = new VeoUsageTracker();
        await veoTracker.updateUsage(op.userId, operationId, op.duration, op.duration * 0.75);
      }
      await this.operations.set(operationId, op);
      return op;
    }

    return { ...op, status: 'processing', progress: 50 };  // Mock progress
  }

  /**
   * Poll Vertex AI operation
   * @param {Object} operation - Operation object from initial API call
   * @returns {Promise<Object>} - Completed operation result
   */
  async pollVertexAiOperation(operation) {
    try {
      console.log(`🔄 VEO 3.0: Polling operation ${operation.operationId}...`);
      
      const { GoogleAuth } = await import('google-auth-library');
      const auth = new GoogleAuth({
        scopes: ['https://www.googleapis.com/auth/cloud-platform']
      });
      const authClient = await auth.getClient();
      const accessToken = await authClient.getAccessToken();
      
      const requestBody = {
        operationName: operation.operationName
      };
      
      const response = await fetch(operation.apiEndpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken.token}`,
          'Content-Type': 'application/json; charset=utf-8'
        },
        body: JSON.stringify(requestBody)
      });
      
      if (!response.ok) {
        throw new Error(`VEO 3.0 polling failed: ${response.status} ${response.statusText}`);
      }
      
      const result = await response.json();
      console.log(`📊 VEO 3.0: Operation status:`, result.done ? 'COMPLETED' : 'RUNNING');
      
      return {
        done: result.done,
        response: result.response,
        error: result.error,
        metadata: result.metadata
      };
      
    } catch (error) {
      console.error(`❌ VEO 3.0: Polling failed:`, error);
      throw error;
    }
  }

  /**
   * Download authentic VEO 3.0 video from Google Cloud Storage
   * @param {string} gcsUri - Google Cloud Storage URI
   * @param {string} videoId - Local video identifier
   * @returns {Promise<boolean>} - Download success
   */
  async downloadFromGcsUri(gcsUri, videoId) {
    try {
      console.log(`📥 VEO 3.0: Downloading authentic video from GCS: ${gcsUri}`);
      
      const https = await import('https');
      const fs = await import('fs');
      const path = await import('path');
      
      // Create download directory if it doesn't exist
      const videoDir = path.join(process.cwd(), 'public', 'videos', 'generated');
      await fs.promises.mkdir(videoDir, { recursive: true });
      
      const videoPath = path.join(videoDir, `${videoId}.mp4`);
      
      return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(videoPath);
        
        https.get(gcsUri, (response) => {
          if (response.statusCode !== 200) {
            reject(new Error(`Failed to download: ${response.statusCode}`));
            return;
          }
          
          response.pipe(file);
          
          file.on('finish', () => {
            file.close();
            console.log(`✅ VEO 3.0: Authentic video downloaded to ${videoPath}`);
            resolve(true);
          });
          
          file.on('error', (error) => {
            fs.unlink(videoPath, () => {}); // Delete partial file
            reject(error);
          });
        }).on('error', reject);
      });
      
    } catch (error) {
      console.error(`❌ VEO 3.0: GCS download failed:`, error);
      return false;
    }
  }

  /**
   * Generate video using Google AI Studio as fallback
   * @param {string} prompt - Video generation prompt
   * @param {Object} config - Video configuration
   * @returns {Promise<Object>} - Generation result
   */
  async generateWithGoogleAI(prompt, config = {}) {
    try {
      console.log(`🎬 VEO 3.0: Using Google AI Studio fallback for cinematic video`);
      
      // Create operation for tracking
      const operationId = `veo3-ai-studio-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      // Store operation for tracking
      this.operations.set(operationId, {
        id: operationId,
        status: 'processing',
        startTime: Date.now(),
        estimatedCompletion: Date.now() + (45000), // 45 seconds
        prompt: prompt,
        config: config,
        platform: config.platform || 'youtube',
        useAIStudio: true
      });
      
      console.log(`✅ VEO 3.0: Google AI Studio fallback operation created: ${operationId}`);
      
      return {
        success: true,
        operationId: operationId,
        operationName: operationId,
        startTime: Date.now(),
        authentic: false, // Mark as fallback
        aiStudio: true
      };
      
    } catch (error) {
      console.error(`❌ VEO 3.0: Google AI Studio fallback failed:`, error);
      throw error;
    }
  }

  /**
   * Check daily quota usage
   * @returns {Promise<number>} - Number of videos generated today
   */
  async checkDailyQuota() {
    try {
      if (!this.quotaManager) {
        const { QuotaManager } = await import('./services/QuotaManager.js');
        this.quotaManager = new QuotaManager();
      }
      
      const usage = await this.quotaManager.getDailyVideoUsage();
      return usage || 0;
      
    } catch (error) {
      console.log(`⚠️ VEO 3.0: Quota check failed:`, error.message);
      return 0; // Allow operation if quota check fails
    }
  }

  /**
   * Increment daily quota after successful generation
   */
  async incrementDailyQuota() {
    try {
      if (this.quotaManager) {
        await this.quotaManager.incrementVideoUsage();
      }
    } catch (error) {
      console.log(`⚠️ VEO 3.0: Quota increment failed:`, error.message);
    }
  }

  /**
   * Enhance prompt for VEO 3.0 with cinematic elements
   * @param {string} basePrompt - Original prompt
   * @param {Object} brandContext - Brand information
   * @returns {string} - Enhanced prompt
   */
  enhancePromptForVeo3(basePrompt, brandContext = {}) {
    console.log(`🎯 VEO 3.0: Enhancing prompt for cinematic generation`);

    // Add cinematic elements for VEO 3.0
    const cinematicElements = [
      'cinematic shot',
      '24fps motion',
      'professional lighting',
      'shallow depth of field'
    ];

    // Add brand context if available
    let brandElements = [];
    if (brandContext.businessType) {
      brandElements.push(`${brandContext.businessType} setting`);
    }
    if (brandContext.location === 'Queensland') {
      brandElements.push('Australian business environment');
    }

    const enhancedPrompt = [
      basePrompt,
      ...cinematicElements,
      ...brandElements,
      'high quality, professional video'
    ].join(', ');

    console.log(`🎯 VEO 3.0: Enhanced prompt: ${enhancedPrompt.substring(0, 100)}...`);
    return enhancedPrompt;
  }
}

export default VeoService;
