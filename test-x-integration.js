/**
 * Test X Integration with OAuth 1.0a
 */

async function testXIntegration() {
  const { xIntegration } = await import('./server/x-integration.js');
  
  console.log('🔄 TESTING X INTEGRATION');
  console.log('========================');
  
  try {
    const result = await xIntegration.postTweet('TheAgencyIQ X platform integration complete! Ready for 9:00 AM JST launch! 🚀');
    
    if (result.success) {
      console.log('✅ X PLATFORM INTEGRATION SUCCESSFUL');
      console.log('Tweet ID:', result.data.id);
      console.log('Tweet URL:', result.data.url);
      console.log('✅ READY FOR LAUNCH');
    } else {
      console.log('❌ X integration failed:', result.error);
    }
  } catch (error) {
    console.log('💥 Error testing X integration:', error.message);
  }
}

testXIntegration();