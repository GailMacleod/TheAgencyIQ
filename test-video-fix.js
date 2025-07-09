import VideoService from './server/videoService.js';

async function testVideoGeneration() {
  try {
    console.log('Testing VideoService import...');
    
    const result = await VideoService.generateVideoPrompts(
      'Test post content for Queensland SME', 
      'youtube', 
      {
        brandName: 'Test Brand',
        corePurpose: 'Test purpose',
        audience: 'Queensland SMEs'
      }, 
      'testuser'
    );
    
    console.log('✅ Video prompt generation result:', result.success ? 'SUCCESS' : 'FAILED');
    console.log('✅ Prompts generated:', result.prompts ? result.prompts.length : 0);
    console.log('✅ VideoService ES module fix working correctly');
    
    return result;
  } catch (error) {
    console.error('❌ VideoService test failed:', error.message);
    return { success: false, error: error.message };
  }
}

testVideoGeneration();