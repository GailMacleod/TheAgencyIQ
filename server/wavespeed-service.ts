/**
 * WAVESPEED AI IMAGE GENERATION SERVICE - SEEDANCE 1.0
 * High-quality photorealistic image generation for social media content
 */

import axios from 'axios';

interface WavespeedImageRequest {
  prompt: string;
  size?: string;
  num_images?: number;
  guidance_scale?: number;
  num_inference_steps?: number;
  enable_safety_checker?: boolean;
  loras?: Array<{
    path: string;
    scale: number;
  }>;
}

interface WavespeedImageResponse {
  success: boolean;
  images?: string[];
  error?: string;
  executionTime?: number;
}

export class WavespeedService {
  private apiKey: string;
  private baseUrl = 'https://api.wavespeed.ai/api/v3/wavespeed-ai/flux-dev-lora-ultra-fast';

  constructor() {
    this.apiKey = process.env.WAVESPEED_API_KEY || '';
    if (!this.apiKey) {
      console.warn('⚠️ WAVESPEED_API_KEY not configured');
    }
  }

  async generateImage(request: WavespeedImageRequest): Promise<WavespeedImageResponse> {
    if (!this.apiKey) {
      return {
        success: false,
        error: 'Wavespeed API key not configured'
      };
    }

    try {
      const startTime = Date.now();
      
      const payload = {
        enable_base64_output: false,
        enable_safety_checker: request.enable_safety_checker ?? true,
        guidance_scale: request.guidance_scale ?? 3.5,
        image: "",
        loras: request.loras ?? [
          {
            path: "strangerzonehf/Flux-Super-Realism-LoRA",
            scale: 1
          }
        ],
        num_images: request.num_images ?? 1,
        num_inference_steps: request.num_inference_steps ?? 28,
        prompt: request.prompt,
        seed: -1,
        size: request.size ?? "1024*1024",
        strength: 0.8
      };

      console.log('🎨 Generating image with Wavespeed AI:', request.prompt.substring(0, 50) + '...');

      const response = await axios.post(this.baseUrl, payload, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        timeout: 60000 // 60 second timeout
      });

      const executionTime = Date.now() - startTime;
      
      if (response.data && response.data.images) {
        console.log(`✅ Image generated successfully in ${executionTime}ms`);
        return {
          success: true,
          images: response.data.images,
          executionTime
        };
      } else {
        console.error('❌ Unexpected Wavespeed response format:', response.data);
        return {
          success: false,
          error: 'Invalid response format from Wavespeed API'
        };
      }

    } catch (error: any) {
      console.error('❌ Wavespeed API error:', error.message);
      
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', error.response.data);
        
        return {
          success: false,
          error: `API Error ${error.response.status}: ${error.response.data?.message || error.message}`
        };
      }

      return {
        success: false,
        error: `Network error: ${error.message}`
      };
    }
  }

  /**
   * Generate platform-specific image prompts for social media
   */
  generatePlatformPrompt(platform: string, content: string, businessType: string = 'business'): string {
    const basePrompt = "Super Realism, High-resolution photograph, UHD, photorealistic, shot on a Sony A7III";
    
    const platformPrompts = {
      facebook: `${basePrompt}, professional ${businessType} setting, modern office environment, natural lighting, clean composition --ar 16:9 --style raw --stylize 250`,
      instagram: `${basePrompt}, aesthetic ${businessType} lifestyle, modern minimalist design, soft natural lighting, premium quality --ar 1:1 --style raw --stylize 300`,
      linkedin: `${basePrompt}, corporate ${businessType} professional, executive office setting, formal lighting, business attire --ar 16:9 --style raw --stylize 200`,
      youtube: `${basePrompt}, dynamic ${businessType} scene, engaging composition, bright lighting, action-oriented --ar 16:9 --style raw --stylize 250`,
      x: `${basePrompt}, modern ${businessType} concept, clean background, focused composition, trending aesthetic --ar 16:9 --style raw --stylize 200`
    };

    return platformPrompts[platform as keyof typeof platformPrompts] || platformPrompts.facebook;
  }

  /**
   * Generate Queensland business-themed images
   */
  generateQueenslandBusinessPrompt(businessType: string, context: string = ''): string {
    const queenlandElements = [
      'Brisbane CBD skyline background',
      'Gold Coast modern office',
      'Sunshine Coast business environment',
      'Queensland subtropical lighting',
      'Australian business professional'
    ];
    
    const randomElement = queenlandElements[Math.floor(Math.random() * queenlandElements.length)];
    
    return `Super Realism, High-resolution photograph, ${businessType} professional in ${randomElement}, ${context}, natural Australian lighting, modern composition, UHD, photorealistic, shot on a Sony A7III --chaos 20 --ar 16:9 --style raw --stylize 250`;
  }

  /**
   * Test Wavespeed API connectivity
   */
  async testConnection(): Promise<boolean> {
    try {
      const testResult = await this.generateImage({
        prompt: "Super Realism, simple test image, professional, UHD --style raw --stylize 100",
        size: "512*512",
        num_inference_steps: 10 // Faster for testing
      });
      
      return testResult.success;
    } catch (error) {
      console.error('Wavespeed connection test failed:', error);
      return false;
    }
  }
}

export const wavespeedService = new WavespeedService();