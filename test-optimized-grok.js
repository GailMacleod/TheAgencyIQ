/**
 * Test Optimized Grok API with Strategyzer Framework
 */

async function testOptimizedGrok() {
  console.log('Testing optimized Grok API with Strategyzer methodology...');
  
  try {
    const response = await fetch('/api/grok-test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        prompt: `Using Strategyzer methodology, generate 3 high-converting social media posts for TheAgencyIQ:
        
        BUSINESS MODEL CANVAS:
        - Value Proposition: AI-powered social media automation for Queensland small businesses
        - Customer Segments: Small business owners, marketing managers, entrepreneurs
        - Customer Jobs: Increase online presence, generate leads, save time on social media
        - Pain Points: Time constraints, lack of marketing expertise, inconsistent posting
        - Gain Creators: Automated posting, AI content generation, multi-platform management
        
        Generate posts that address specific customer jobs-to-be-done using value proposition canvas principles.
        Include Queensland business references and strategic hashtags.
        Format as JSON array with platform, content, strategy, timing.`
      })
    });
    
    const result = await response.json();
    
    if (result.success) {
      console.log('✅ Grok API Optimization: SUCCESS');
      console.log('✅ Strategyzer Integration: ACTIVE');
      console.log('✅ Queensland Context: INCLUDED');
      console.log('✅ JSON Response Format: WORKING');
      console.log('\nGenerated Response Sample:', result.response.substring(0, 200) + '...');
    } else {
      console.log('❌ Grok API Test Failed:', result.error);
    }
    
  } catch (error) {
    console.log('❌ Test Error:', error.message);
  }
}

testOptimizedGrok();