/**
 * LOCAL CONTENT ENGINE - Transformers.js Implementation
 * Zero external API dependencies, pure Replit-native generation
 */

import { pipeline } from '@xenova/transformers';

let generator: any;
let isInitializing = false;

const initGenerator = async () => {
  if (generator || isInitializing) return generator;
  
  isInitializing = true;
  console.log('[LOCAL-ENGINE] Initializing DistilGPT2 for content generation...');
  
  try {
    generator = await pipeline('text-generation', 'distilgpt2');
    console.log('[LOCAL-ENGINE] Generator ready');
    isInitializing = false;
    return generator;
  } catch (error) {
    console.error('[LOCAL-ENGINE] Initialization failed:', error);
    isInitializing = false;
    throw error;
  }
};

export const generateContent = async (prompt?: string): Promise<string> => {
  try {
    if (!generator) {
      await initGenerator();
    }
    
    const basePrompt = prompt || 'Write a professional social media post about business automation and digital transformation for Queensland businesses:';
    
    const output = await generator(basePrompt, { 
      max_length: 80, 
      num_return_sequences: 1,
      temperature: 0.8,
      do_sample: true,
      pad_token_id: 50256
    });
    
    let content = output[0].generated_text;
    
    // Clean and format the output
    content = content.replace(basePrompt, '').trim();
    content = content.split('\n')[0]; // Take first line only
    content = content.substring(0, 250); // Limit length
    
    // Add professional formatting
    if (!content.includes('#')) {
      content += ' #BusinessAutomation #DigitalTransformation #Queensland';
    }
    
    return content || 'Transform your business with smart automation! The AgencyIQ helps Queensland businesses save time and increase engagement. #BusinessAutomation';
    
  } catch (error) {
    console.error('[LOCAL-ENGINE] Generation error:', error);
    // Fallback to template-based generation
    return generateFallbackContent();
  }
};

const generateFallbackContent = (): string => {
  const templates = [
    "Transform your Queensland business with smart automation! Save time, increase engagement, and watch your social media presence soar. #BusinessAutomation #Queensland",
    "Ready to dominate your social media? Our AI-powered automation ensures consistent, professional posting while you focus on growth. #SocialMediaAutomation",
    "Stop struggling with daily social media tasks! Automated content scheduling means more time for what matters most - your customers. #DigitalTransformation",
    "Queensland businesses are discovering the power of automated social media management. Join the revolution today! #Queensland #BusinessGrowth",
    "Your competitors are already using automation to stay ahead. Level the playing field with smart social media scheduling. #CompetitiveAdvantage"
  ];
  
  return templates[Math.floor(Math.random() * templates.length)];
};

// Auto-initialize on module load
initGenerator().catch(console.error);