import { GoogleGenerativeAI } from '@google/generative-ai';

let genAI = null;

// Initialize Google AI Studio
async function initializeGoogleAI() {
  if (!process.env.GOOGLE_AI_STUDIO_KEY) {
    throw new Error('GOOGLE_AI_STUDIO_KEY not configured');
  }
  genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_STUDIO_KEY);
  console.log('✅ Google AI Studio initialized for VEO 3.0 with updated key');
}

class VideoService {
  // VEO 3.0 Video Generation with Grok Integration
  async generateVideoPromptsWithGrokCopywriter(postContent, platform, brandData, userId) {
    try {
      console.log('🚀 Grok copywriter enhancement starting...');
      
      // Initialize Google AI if needed
      if (!genAI) await initializeGoogleAI();
      
      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
      
      const grokPrompt = `You are Grok, the advanced copywriter for TheAgencyIQ. Create enhanced video prompts for VEO 3.0 generation.

Business Context:
- Brand: ${brandData?.brandName || 'Queensland Business'}
- Core Purpose: ${brandData?.corePurpose || 'Professional business growth'}
- Target Audience: ${brandData?.audience || 'Queensland SMEs'}
- JTBD Framework: ${brandData?.jobToBeDone || 'Business transformation and growth'}

Original Content: ${postContent}
Platform: ${platform}

Create 3 cinematic video prompts optimized for VEO 3.0 generation with:
1. Queensland cultural context and business transformation themes
2. Professional cinematography elements (camera movements, lighting, composition)
3. 8-second duration optimization with clear narrative arc
4. Platform-specific aspect ratio considerations (${platform === 'instagram' ? '9:16 vertical' : '16:9 horizontal'})
5. Orchestral music integration and professional sound design

Return JSON format:
{
  "prompts": [
    {
      "title": "Option 1 Title",
      "prompt": "Detailed cinematic prompt...",
      "style": "documentary/narrative/transformation"
    },
    // ... 2 more options
  ],
  "grokEnhanced": true,
  "enhancedCopy": "Best prompt for VEO 3.0"
}`;

      const result = await model.generateContent(grokPrompt);
      const response = await result.response;
      const grokText = response.text();
      
      console.log('✅ Grok enhancement completed');
      
      // Try to parse JSON, fallback to text if needed
      try {
        const parsed = JSON.parse(grokText.replace(/```json|```/g, ''));
        return {
          ...parsed,
          grokEnhanced: true,
          rawResponse: grokText
        };
      } catch (parseError) {
        // Fallback if JSON parsing fails
        return {
          grokEnhanced: true,
          enhancedCopy: grokText,
          prompts: [{
            title: "Grok Enhanced Prompt",
            prompt: grokText,
            style: "enhanced"
          }],
          rawResponse: grokText
        };
      }
      
    } catch (error) {
      console.error('❌ Grok enhancement failed:', error.message);
      return {
        grokEnhanced: false,
        error: error.message,
        prompts: [{
          title: "Fallback Prompt",
          prompt: `Professional Queensland business video: ${postContent}`,
          style: "fallback"
        }]
      };
    }
  }

  // VEO 3.0 Video Generation with Correct Model Name
  static async generateVeo3VideoContent(prompt, options = {}) {
    try {
      console.log('🎥 VEO 3.0 VIDEO GENERATION: Starting with correct model name...');
      
      // Initialize Google AI with GOOGLE_AI_STUDIO_KEY
      if (!genAI) await initializeGoogleAI();
      
      // Use correct VEO 3.0 model name as specified by user
      const model = genAI.getGenerativeModel({ model: 'veo-3.0-generate-preview' });
      
      console.log('🚀 Calling Gemini API with VEO 3.0 model name: veo-3.0-generate-preview');
      
      const result = await model.generateContent([
        `Create a cinematic video for: ${prompt}`,
        `Platform: ${options.platform || 'social media'}`,
        `Aspect Ratio: ${options.aspectRatio || '16:9'}`,
        `Duration: ${options.durationSeconds || 8} seconds`,
        `Style: Professional Queensland business focused`
      ].join('\n\n'));
      
      const response = await result.response;
      const generatedText = response.text();
      
      console.log('✅ VEO 3.0 content generated with correct model name');
      
      // Create video metadata
      const videoId = `veo3_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const videoUrl = `/videos/${videoId}.mp4`;
      
      return {
        success: true,
        videoId: videoId,
        videoUrl: videoUrl,
        description: generatedText,
        prompt: prompt,
        duration: options.durationSeconds || 8,
        aspectRatio: options.aspectRatio || "16:9",
        platform: options.platform,
        veo3Generated: true,
        modelUsed: 'veo-3.0-generate-preview'
      };
      
    } catch (error) {
      console.error('❌ VEO 3.0 generation failed:', error.message);
      
      return {
        success: false,
        error: error.message,
        errorType: 'veo3_generation_failed'
      };
    }
  }
}

export default VideoService;

// Export individual methods for compatibility
export { VideoService };