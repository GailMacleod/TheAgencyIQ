/**
 * REPLIT-NATIVE LOCAL AI CONTENT GENERATOR
 * Uses Transformers.js for offline content generation - no external APIs
 */

import { pipeline } from '@xenova/transformers';

let generator: any;

const initGenerator = async () => {
  console.log('[LOCAL-AI] Initializing Transformers.js GPT-2 model...');
  generator = await pipeline('text-generation', 'gpt2');
  console.log('[LOCAL-AI] Generator initialized successfully');
};

// Initialize on module load
initGenerator().catch(error => {
  console.error('[LOCAL-AI] Failed to initialize generator:', error);
});

const generateContent = async (prompt: string = 'Write a tech social media post about business automation.'): Promise<string> => {
  try {
    if (!generator) {
      console.log('[LOCAL-AI] Generator not ready, initializing...');
      await initGenerator();
    }
    
    const output = await generator(prompt, { 
      max_length: 100, 
      num_return_sequences: 1,
      temperature: 0.8,
      do_sample: true
    });
    
    return output[0].generated_text;
  } catch (error) {
    console.error('[LOCAL-AI] Content generation error:', error);
    // Fallback to template-based generation
    return generateFallbackContent();
  }
};

const generateFallbackContent = (): string => {
  const templates = [
    "Transform your business with smart automation! The AgencyIQ helps Queensland businesses save time and increase engagement across all social platforms.",
    "Ready to dominate your social media? Our AI-powered automation ensures consistent, professional posting while you focus on growing your business.",
    "Stop struggling with daily social media tasks! The AgencyIQ automates your entire content strategy for maximum impact and minimal effort.",
    "Queensland businesses are discovering the power of automated social media management. Join the revolution with The AgencyIQ today!",
    "Your competitors are already using automation to stay ahead. Level the playing field with The AgencyIQ's smart posting system."
  ];
  
  const randomTemplate = templates[Math.floor(Math.random() * templates.length)];
  return `${randomTemplate} #QueenslandBusiness #TheAgencyIQ #Automation`;
};

export { generateContent, initGenerator };