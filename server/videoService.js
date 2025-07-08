/**
 * VIDEO GENERATION SERVICE - SEEDANCE 1.0 INTEGRATION
 * Handles AI video generation, prompt creation, and platform posting
 */

import axios from 'axios';
import { PostQuotaService } from './PostQuotaService.js';

// Seedance API configuration - Official Replicate Integration
const REPLICATE_API_BASE = 'https://api.replicate.com/v1';
const SEEDANCE_MODEL = 'bytedance/seedance-1-lite';

export class VideoService {
  static async generateVideoPrompts(postContent, platform, brandData) {
    try {
      // Generate two AI prompts: short-form and ASMR
      const prompts = await this.createOnBrandPrompts(postContent, platform, brandData);
      
      return {
        success: true,
        prompts: [
          {
            type: 'Strategic ASMR Short-Form',
            content: prompts.shortForm,
            duration: '15-30s',
            style: 'ASMR business strategy - whispered insights with visual appeal'
          },
          {
            type: 'Brand-Aligned ASMR',
            content: prompts.asmr,
            duration: '30-45s',
            style: 'Strategic ASMR - soothing narration with brand purpose focus'
          }
        ]
      };
    } catch (error) {
      console.error('Video prompt generation failed:', error);
      return {
        success: false,
        error: 'Failed to generate video prompts',
        fallback: true
      };
    }
  }

  static async createOnBrandPrompts(postContent, platform, brandData) {
    const brandName = (brandData && brandData.brandName) || 'The AgencyIQ';
    const coreMessage = (brandData && brandData.corePurpose) || 'Professional business visibility';
    
    // Platform-specific video requirements
    const platformSpecs = {
      'Instagram': { aspect: '9:16', duration: '15-30s', style: 'visual-first' },
      'YouTube': { aspect: '16:9', duration: '30-60s', style: 'narrative' },
      'Facebook': { aspect: '1:1', duration: '15-45s', style: 'community' },
      'LinkedIn': { aspect: '1:1', duration: '30-60s', style: 'professional' },
      'X': { aspect: '16:9', duration: '15-30s', style: 'quick-impact' }
    };

    const spec = platformSpecs[platform] || platformSpecs['Instagram'];
    
    // Extract strategic themes from brand-aligned post content
    const contentWords = postContent.toLowerCase();
    const businessTerms = ['automation', 'efficiency', 'productivity', 'growth', 'success', 'professional', 'business', 'entrepreneur', 'sme', 'queensland', 'time-poor', 'visibility', 'competitive'];
    const foundTerms = businessTerms.filter(term => contentWords.includes(term));
    
    return {
      shortForm: `ASMR Business Strategy Video: "${postContent.substring(0, 120)}"
        Visual: Soft-focused modern office with gentle lighting, minimal distractions
        Audio: Whispered professional narration explaining strategic insights from post content
        Text overlay: Key strategic points appearing softly
        Duration: ${spec.duration}
        Style: ASMR ${spec.style} - gentle, strategic, calming business guidance
        Brand alignment: ${coreMessage}
        Queensland focus: ${foundTerms.includes('queensland') ? 'Local market insights' : 'SME growth strategies'}`,
        
      asmr: `Strategic ASMR Short-Form: "${coreMessage}"
        Visual: Close-up gentle business visuals - soft keyboard typing, paper rustling, strategic planning materials
        Audio: Whispered strategic insights about "${postContent.substring(0, 100)}"
        Sound effects: Gentle paper sounds, soft pen writing, calm office ambiance
        Duration: ${spec.duration}
        Style: ASMR business strategy - soothing yet authoritative delivery
        Content focus: ${foundTerms.join(', ') || 'business transformation and growth'}
        Execution: Short-form ASMR with strategic depth based on brand purpose`
    };
  }

  static async renderVideo(prompt, editedText, platform) {
    try {
      console.log(`🎬 Starting REAL Seedance video rendering for ${platform}...`);
      const startTime = Date.now();
      
      // Use actual text content for video generation - prioritize edited text, then prompt content
      let videoPrompt;
      if (editedText && editedText.trim()) {
        videoPrompt = editedText.trim();
      } else if (prompt && typeof prompt === 'object' && prompt.content) {
        videoPrompt = prompt.content;
      } else if (typeof prompt === 'string') {
        videoPrompt = prompt;
      } else {
        throw new Error('No valid video prompt provided');
      }
      
      console.log('🎬 Using video prompt:', videoPrompt.substring(0, 100) + '...');
      
      // Platform-specific video requirements (URLs only, no local storage)
      const platformSettings = {
        'Instagram': { 
          resolution: '1080p', 
          aspectRatio: '9:16', 
          maxDuration: 60, 
          maxSize: '100MB',
          formats: ['mp4', 'mov'],
          urlRequirements: 'Direct HTTPS URL, public accessible'
        },
        'YouTube': { 
          resolution: '1080p', 
          aspectRatio: '16:9', 
          maxDuration: 900, // 15 minutes
          maxSize: '256MB',
          formats: ['mp4', 'mov', 'avi'],
          urlRequirements: 'Direct HTTPS URL or YouTube upload API'
        },
        'Facebook': { 
          resolution: '1080p', 
          aspectRatio: '16:9', 
          maxDuration: 240, // 4 minutes
          maxSize: '10GB',
          formats: ['mp4', 'mov'],
          urlRequirements: 'Direct HTTPS URL, publicly accessible'
        },
        'LinkedIn': { 
          resolution: '1080p', 
          aspectRatio: '16:9', 
          maxDuration: 600, // 10 minutes
          maxSize: '5GB',
          formats: ['mp4', 'asf', 'avi'],
          urlRequirements: 'Direct HTTPS URL, public accessible'
        },
        'X': { 
          resolution: '1080p', 
          aspectRatio: '16:9', 
          maxDuration: 140, // 2:20 minutes
          maxSize: '512MB',
          formats: ['mp4', 'mov'],
          urlRequirements: 'Direct HTTPS URL, public accessible'
        }
      };
      
      const settings = platformSettings[platform] || { 
        resolution: '1080p', 
        aspectRatio: '16:9', 
        maxDuration: 60,
        maxSize: '100MB',
        formats: ['mp4'],
        urlRequirements: 'Direct HTTPS URL'
      };
      
      // Official Seedance API via Replicate
      const replicateApiKey = process.env.REPLICATE_API_TOKEN;
      if (!replicateApiKey) {
        throw new Error('Replicate API token not configured');
      }
      
      // Create prediction with Seedance model using proper Replicate format
      const predictionPayload = {
        input: {
          prompt: videoPrompt,
          duration: Math.min(settings.maxDuration, 15), // Cap at 15s for social media
          resolution: settings.resolution,
          aspect_ratio: settings.aspectRatio,
          fps: 24,
          camera_fixed: false,
          seed: Math.floor(Math.random() * 1000000),
          format: 'mp4' // Ensure MP4 format for maximum compatibility
        }
      };
      
      console.log('Calling Official Seedance API via Replicate:', { 
        prompt: videoPrompt.substring(0, 100) + '...', 
        resolution: settings.resolution,
        aspectRatio: settings.aspectRatio,
        duration: Math.min(settings.maxDuration, 15),
        platform: platform,
        urlRequirements: settings.urlRequirements
      });
      
      // Create prediction using Replicate's model-specific endpoint
      const predictionResponse = await axios.post(
        `${REPLICATE_API_BASE}/models/${SEEDANCE_MODEL}/predictions`,
        predictionPayload,
        {
          headers: {
            'Authorization': `Token ${replicateApiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 180000 // 3 minute timeout for video generation
        }
      );
      
      if (predictionResponse.data && predictionResponse.data.id) {
        const predictionId = predictionResponse.data.id;
        
        // Wait for completion (polls until done) - Optimized polling
        let videoResult = null;
        const maxAttempts = 18; // 3 minutes max wait with 10s intervals
        
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
          console.log(`🔄 Checking Seedance generation status... (${attempt + 1}/${maxAttempts})`);
          
          await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds
          
          const statusResponse = await axios.get(
            `${REPLICATE_API_BASE}/predictions/${predictionId}`,
            {
              headers: {
                'Authorization': `Token ${replicateApiKey}`,
                'Content-Type': 'application/json'
              }
            }
          );
          
          console.log(`Status: ${statusResponse.data.status}`);
          
          if (statusResponse.data.status === 'succeeded') {
            videoResult = statusResponse.data;
            break;
          } else if (statusResponse.data.status === 'failed') {
            throw new Error(`Seedance generation failed: ${statusResponse.data.error || 'Unknown error'}`);
          } else if (statusResponse.data.status === 'canceled') {
            throw new Error('Seedance generation was canceled');
          }
          // Continue polling if status is 'starting' or 'processing'
        }
        
        if (!videoResult) {
          throw new Error('Seedance video generation timed out after 3 minutes');
        }
        
        console.log(`✅ Real Seedance video generated in ${Date.now() - startTime}ms`);
        
        return {
          success: true,
          videoId: predictionId,
          url: videoResult.output, // Direct HTTPS URL - no local storage
          duration: Date.now() - startTime,
          quality: settings.resolution,
          format: 'mp4',
          aspectRatio: settings.aspectRatio,
          size: 'Generated',
          platform: platform,
          maxSize: settings.maxSize,
          platformCompliant: true,
          urlRequirements: settings.urlRequirements,
          seedanceResponse: videoResult
        };
      } else {
        throw new Error('Failed to create Seedance prediction');
      }
    } catch (error) {
      console.error('Real Seedance video rendering failed:', error);
      
      // Fallback to demo for API issues - provide specific error guidance
      if (error.message.includes('API key') || error.response?.status === 401 || error.response?.status === 402 || error.response?.status === 422) {
        console.log('🎬 Falling back to demo video for API issues...');
        console.log('API Error Details:', error.response?.data || error.message);
        
        const videoId = `demo_video_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        return {
          success: true,
          videoId,
          url: `https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4`, // Direct HTTPS URL - no local storage
          duration: 2300,
          quality: settings.resolution,
          format: 'mp4',
          aspectRatio: settings.aspectRatio,
          size: '2.1MB',
          platform: platform,
          maxSize: settings.maxSize,
          platformCompliant: true,
          urlRequirements: settings.urlRequirements,
          fallback: true,
          error: error.response?.status === 402 ? 
            'Demo video - Replicate billing required for Seedance (visit replicate.com/account/billing)' :
            'Demo video - Check Replicate API configuration',
          apiError: error.response?.data || error.message
        };
      }
      
      return {
        success: false,
        error: `Seedance API error: ${error.message}`,
        fallback: false
      };
    }
  }

  static async approveAndPostVideo(userId, postId, videoData, platforms) {
    try {
      // Check quota before posting
      const hasQuota = await PostQuotaService.hasPostsRemaining(userId);
      if (!hasQuota) {
        return {
          success: false,
          error: 'No posts remaining in quota'
        };
      }

      // Post to all connected platforms
      const postingResults = [];
      
      for (const platform of platforms) {
        try {
          const result = await this.postVideoToPlatform(platform, videoData, postId);
          postingResults.push({ platform, success: result.success, error: result.error });
        } catch (error) {
          postingResults.push({ platform, success: false, error: error.message });
        }
      }

      // Deduct quota after successful posting
      if (postingResults.some(r => r.success)) {
        await PostQuotaService.postApproved(userId, postId);
      }

      return {
        success: true,
        results: postingResults,
        videoUrl: videoData.url,
        postedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Video posting failed:', error);
      return {
        success: false,
        error: 'Failed to post video content'
      };
    }
  }

  static async postVideoToPlatform(platform, videoData, postId) {
    // Validate platform compliance before posting
    const validation = this.validatePlatformVideoCompliance(videoData, platform);
    if (!validation.valid) {
      return {
        success: false,
        error: validation.error,
        platform: platform
      };
    }

    console.log(`📤 Posting platform-compliant video to ${platform}:`, {
      url: videoData.url,
      format: videoData.format,
      aspectRatio: videoData.aspectRatio,
      platformCompliant: validation.valid
    });
    
    // Mock platform posting - integrate with existing OAuth system
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          success: true,
          platform,
          postId: `${platform.toLowerCase()}_${postId}_${Date.now()}`,
          url: videoData.url, // Direct HTTPS URL - no local storage
          platformCompliant: true,
          urlType: 'external'
        });
      }, 500);
    });
  }

  static async proxyVideo(videoId) {
    try {
      // Proxy video content for CORS compatibility
      const videoUrl = `https://seedance-mock.api/videos/${videoId}.mp4`;
      
      // In production, this would fetch and proxy the actual video
      return {
        success: true,
        url: videoUrl,
        headers: {
          'Content-Type': 'video/mp4',
          'Access-Control-Allow-Origin': '*'
        }
      };
    } catch (error) {
      return {
        success: false,
        error: 'Video proxy failed'
      };
    }
  }

  static validatePlatformVideoCompliance(videoData, platform) {
    // Validate video URLs and formats for each platform
    const platformSettings = {
      'Instagram': { 
        maxDuration: 60, 
        maxSize: 100 * 1024 * 1024, // 100MB
        aspectRatios: ['9:16', '1:1', '4:5'],
        formats: ['mp4', 'mov']
      },
      'YouTube': { 
        maxDuration: 900, // 15 minutes
        maxSize: 256 * 1024 * 1024, // 256MB
        aspectRatios: ['16:9', '4:3'],
        formats: ['mp4', 'mov', 'avi']
      },
      'Facebook': { 
        maxDuration: 240, // 4 minutes
        maxSize: 10 * 1024 * 1024 * 1024, // 10GB
        aspectRatios: ['16:9', '1:1', '4:5'],
        formats: ['mp4', 'mov']
      },
      'LinkedIn': { 
        maxDuration: 600, // 10 minutes
        maxSize: 5 * 1024 * 1024 * 1024, // 5GB
        aspectRatios: ['16:9', '1:1'],
        formats: ['mp4', 'asf', 'avi']
      },
      'X': { 
        maxDuration: 140, // 2:20 minutes
        maxSize: 512 * 1024 * 1024, // 512MB
        aspectRatios: ['16:9', '1:1'],
        formats: ['mp4', 'mov']
      }
    };

    const settings = platformSettings[platform];
    if (!settings) {
      return { valid: false, error: `Unknown platform: ${platform}` };
    }

    // Validate URL is HTTPS
    if (!videoData.url || !videoData.url.startsWith('https://')) {
      return { valid: false, error: `Platform ${platform} requires HTTPS video URLs` };
    }

    // Validate format
    if (!settings.formats.includes(videoData.format)) {
      return { valid: false, error: `Platform ${platform} doesn't support ${videoData.format} format` };
    }

    // Validate aspect ratio
    if (videoData.aspectRatio && !settings.aspectRatios.includes(videoData.aspectRatio)) {
      return { valid: false, error: `Platform ${platform} doesn't support ${videoData.aspectRatio} aspect ratio` };
    }

    return { 
      valid: true, 
      platform: platform,
      urlCompliant: true,
      formatCompliant: true,
      aspectRatioCompliant: true
    };
  }

  static validateVideoLimits(userId, postId) {
    // Track one video per post limit
    const key = `video_${userId}_${postId}`;
    
    // Mock validation - in production, check database
    return {
      canGenerate: true,
      reason: 'Video generation allowed'
    };
  }
}