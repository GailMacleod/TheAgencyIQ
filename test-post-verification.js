/**
 * TEST POST VERIFICATION AND DEDUCTION SYSTEM
 * Independent test script for the post verification service
 */

// Test function matching your requested format
async function checkAndDeductPost(subscriptionId, postId) {
  try {
    const response = await fetch('/api/check-post', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subscriptionId, postId })
    });
    const result = await response.json();
    if (result.success) {
      console.log('Post registered and deducted successfully');
      console.log('Remaining posts:', result.remainingPosts);
    } else {
      console.log('Failed:', result.message);
    }
    return result;
  } catch (error) {
    console.error('Error:', error);
    return { success: false, error: error.message };
  }
}

// Test the complete verification flow
async function testVerificationFlow() {
  console.log('🧪 Testing Post Verification System');
  
  // Test with existing post ID and phone number
  const subscriptionId = '+61438727717'; // User's phone number
  const postId = 945; // Existing post ID
  
  console.log(`Testing verification for post ${postId} with subscription ${subscriptionId}`);
  
  const result = await checkAndDeductPost(subscriptionId, postId);
  
  console.log('Test result:', JSON.stringify(result, null, 2));
  
  // Test bulk verification
  console.log('\n🔢 Testing Bulk Verification');
  const bulkResult = await fetch('/api/check-posts-bulk', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      subscriptionId: subscriptionId, 
      postIds: [945, 946, 947] 
    })
  });
  
  if (bulkResult.ok) {
    const bulk = await bulkResult.json();
    console.log('Bulk verification results:', JSON.stringify(bulk, null, 2));
  }
  
  // Test platform verification
  console.log('\n🔍 Testing Platform Verification');
  const platformResult = await fetch('/api/verify-platform-posts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      postId: 945, 
      platforms: ['facebook', 'linkedin', 'x'] 
    })
  });
  
  if (platformResult.ok) {
    const platform = await platformResult.json();
    console.log('Platform verification results:', JSON.stringify(platform, null, 2));
  }
}

// Example usage as independent flow after successful LinkedIn post
async function exampleAfterLinkedInPost() {
  console.log('\n📝 Example: After successful LinkedIn post');
  
  // Simulate successful LinkedIn post with ID 948
  const linkedInPostId = 948;
  const userPhone = '+61438727717';
  
  // Call verification independently (avoid integrating into existing flows)
  setTimeout(async () => {
    console.log('Running independent verification after LinkedIn post...');
    await checkAndDeductPost(userPhone, linkedInPostId);
  }, 1000); // Run 1 second after post completion
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    checkAndDeductPost,
    testVerificationFlow,
    exampleAfterLinkedInPost
  };
}

// Run test if this file is executed directly
if (typeof window === 'undefined') {
  testVerificationFlow().catch(console.error);
}