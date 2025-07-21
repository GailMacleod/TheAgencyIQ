/**
 * VEO 2.0 Video Generation Service
 * Implements proper Google AI Studio API integration based on official documentation
 */

import { GoogleGenerativeAI } from '@google/generative-ai';

class VeoService {
  constructor() {
    this.genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_STUDIO_KEY);
    this.VEO2_MODEL = 'veo-2.0-generate-001';
    this.operations = new Map(); // Track ongoing operations
  }

  /**
   * Generate video using VEO 2.0 API with proper async polling
   * @param {string} prompt - Text description for video
   * @param {Object} config - Video generation configuration
   * @returns {Promise<Object>} - Video generation result
   */
  async generateVideo(prompt, config = {}) {
    try {
      console.log(`🎬 VEO 2.0: Starting video generation for prompt: ${prompt.substring(0, 100)}...`);
      
      const defaultConfig = {
        aspectRatio: '16:9',
        durationSeconds: 8,
        resolution: '720p',
        negativePrompt: 'blurry, low quality, text, watermark',
        enhancePrompt: true,
        personGeneration: 'allow_adult'
      };

      const finalConfig = { ...defaultConfig, ...config };
      
      // Start video generation operation
      const operation = await this.genAI.models.generateVideos({
        model: this.VEO2_MODEL,
        prompt: prompt,
        config: finalConfig
      });

      console.log(`🔄 VEO 2.0: Operation started - ${operation.name}`);
      
      // Store operation for tracking
      this.operations.set(operation.name, {
        startTime: Date.now(),
        prompt: prompt,
        config: finalConfig,
        status: 'processing'
      });

      // Poll for completion with exponential backoff
      const result = await this.pollVideoGeneration(operation);
      
      if (result.success) {
        console.log(`✅ VEO 2.0: Video generation completed - ${result.videoUrl}`);
        return {
          success: true,
          videoId: result.videoId,
          videoUrl: result.videoUrl,
          gcsUri: result.gcsUri,
          duration: finalConfig.durationSeconds,
          aspectRatio: finalConfig.aspectRatio,
          resolution: finalConfig.resolution,
          generationTime: Date.now() - this.operations.get(operation.name).startTime,
          prompt: prompt,
          veo2Generated: true,
          mimeType: 'video/mp4'
        };
      } else {
        throw new Error(result.error || 'VEO 2.0 generation failed');
      }

    } catch (error) {
      console.error(`❌ VEO 2.0 generation error:`, error);
      return {
        success: false,
        error: error.message,
        fallbackRequired: true
      };
    }
  }

  /**
   * Poll video generation operation until completion
   * @param {Object} operation - Initial operation object
   * @returns {Promise<Object>} - Final result
   */
  async pollVideoGeneration(operation) {
    const maxPollingTime = 5 * 60 * 1000; // 5 minutes max
    const pollInterval = 10000; // Start with 10 seconds
    const startTime = Date.now();
    
    let currentOperation = operation;
    let attempt = 0;

    while (!currentOperation.done && (Date.now() - startTime) < maxPollingTime) {
      attempt++;
      const waitTime = Math.min(pollInterval * Math.pow(1.2, attempt), 30000); // Max 30s
      
      console.log(`🔄 VEO 2.0: Polling attempt ${attempt} - waiting ${waitTime/1000}s...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));

      try {
        // Get updated operation status
        currentOperation = await this.genAI.operations.getVideosOperation({
          operation: currentOperation
        });

        if (currentOperation.done) {
          break;
        }

        // Update operation tracking
        const tracked = this.operations.get(operation.name);
        if (tracked) {
          tracked.status = 'processing';
          tracked.attempts = attempt;
        }

      } catch (pollError) {
        console.error(`⚠️ VEO 2.0: Polling error on attempt ${attempt}:`, pollError);
        
        if (attempt >= 5) {
          throw new Error(`Polling failed after ${attempt} attempts`);
        }
      }
    }

    if (!currentOperation.done) {
      throw new Error('Video generation timed out after 5 minutes');
    }

    // Process completed operation
    return await this.processCompletedOperation(currentOperation);
  }

  /**
   * Process completed video generation operation
   * @param {Object} operation - Completed operation
   * @returns {Promise<Object>} - Processed result
   */
  async processCompletedOperation(operation) {
    try {
      if (operation.response && operation.response.generatedVideos) {
        const video = operation.response.generatedVideos[0];
        const videoId = `veo2_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        // Download video from GCS URI
        const localVideoPath = await this.downloadVideoFromGCS(video.video, videoId);
        
        return {
          success: true,
          videoId: videoId,
          videoUrl: localVideoPath,
          gcsUri: video.video.uri,
          mimeType: video.video.mimeType || 'video/mp4'
        };
      } else {
        throw new Error('No video generated in operation response');
      }
    } catch (error) {
      console.error(`❌ VEO 2.0: Failed to process completed operation:`, error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Download video from Google Cloud Storage URI and save locally
   * @param {Object} videoFile - Video file object from API
   * @param {string} videoId - Local video ID
   * @returns {Promise<string>} - Local video path
   */
  async downloadVideoFromGCS(videoFile, videoId) {
    try {
      console.log(`📥 VEO 2.0: Downloading video from GCS...`);
      
      // Use Google AI SDK to download
      await this.genAI.files.download({
        file: videoFile,
        downloadPath: `public/videos/${videoId}.mp4`
      });

      const localPath = `/videos/${videoId}.mp4`;
      console.log(`✅ VEO 2.0: Video saved to ${localPath}`);
      
      return localPath;
    } catch (error) {
      console.error(`❌ VEO 2.0: Failed to download video:`, error);
      throw error;
    }
  }

  /**
   * Generate video with image input (image-to-video)
   * @param {string} prompt - Text prompt
   * @param {Buffer|string} imageData - Image data or base64
   * @param {Object} config - Configuration
   * @returns {Promise<Object>} - Generation result
   */
  async generateVideoFromImage(prompt, imageData, config = {}) {
    try {
      console.log(`🎬 VEO 2.0: Starting image-to-video generation...`);
      
      let imageBytes;
      if (typeof imageData === 'string') {
        // Assume base64
        imageBytes = Buffer.from(imageData, 'base64');
      } else {
        imageBytes = imageData;
      }

      const operation = await this.genAI.models.generateVideos({
        model: this.VEO2_MODEL,
        prompt: prompt,
        image: {
          imageBytes: imageBytes,
          mimeType: 'image/jpeg'
        },
        config: {
          aspectRatio: '16:9',
          durationSeconds: 8,
          ...config
        }
      });

      return await this.pollVideoGeneration(operation);
    } catch (error) {
      console.error(`❌ VEO 2.0: Image-to-video generation failed:`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get operation status
   * @param {string} operationName - Operation name
   * @returns {Object} - Operation status
   */
  getOperationStatus(operationName) {
    return this.operations.get(operationName) || { status: 'unknown' };
  }

  /**
   * Enhanced prompt optimization for VEO 2.0
   * @param {string} prompt - Original prompt
   * @param {Object} brandContext - Brand context
   * @returns {string} - Enhanced prompt
   */
  enhancePromptForVeo2(prompt, brandContext = {}) {
    const basePrompt = prompt.trim();
    
    // Add cinematic elements for VEO 2.0
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

    console.log(`🎯 VEO 2.0: Enhanced prompt: ${enhancedPrompt.substring(0, 100)}...`);
    return enhancedPrompt;
  }
}

export default VeoService;