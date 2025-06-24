const { pipeline } = require('@xenova/transformers');
let generator;

(async () => {
  try {
    console.log('[GENERATOR] Initializing DistilGPT2...');
    generator = await pipeline('text-generation', 'distilgpt2');
    console.log('[GENERATOR] Ready');
  } catch (error) {
    console.error('[GENERATOR] Init failed:', error);
  }
})();

const generateContent = async () => {
  if (!generator) {
    console.log('[GENERATOR] Not ready, using fallback');
    return 'Tech update: AI in action! #tech';
  }
  try {
    const output = await generator('Write a tech social media post.', { 
      max_length: 50, 
      num_return_sequences: 1 
    });
    return output[0].generated_text;
  } catch (error) {
    console.error('[GENERATOR] Error:', error);
    return 'Tech update: AI in action! #tech';
  }
};

module.exports = { generateContent };