/**
 * Direct X.AI Credentials Test
 * Tests X.AI API key functionality using fetch
 */

async function testXAICredentials() {
  console.log('Testing X.AI Credentials...');
  
  // Check if API key exists in environment
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) {
    console.log('XAI_API_KEY environment variable not found');
    return false;
  }
  
  console.log('XAI_API_KEY found in environment');
  console.log('API Key format:', apiKey.substring(0, 10) + '...');
  
  try {
    console.log('Testing Grok API connection...');
    
    const response = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "grok-2-1212",
        messages: [
          {
            role: "user",
            content: "Generate a brief business insight for Queensland small businesses. Keep it under 100 words."
          }
        ],
        max_tokens: 150
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }
    
    const data = await response.json();
    const insight = data.choices[0].message.content;
    
    console.log('X.AI API connection successful!');
    console.log('Generated insight:', insight);
    console.log('Token usage:', data.usage);
    
    return {
      success: true,
      insight: insight,
      usage: data.usage,
      model: "grok-2-1212"
    };
    
  } catch (error) {
    console.log('X.AI API test failed:', error.message);
    
    if (error.message.includes('401')) {
      console.log('Authentication error - API key may be invalid or expired');
    } else if (error.message.includes('quota')) {
      console.log('Quota exceeded - API usage limit reached');
    } else if (error.message.includes('network')) {
      console.log('Network error - check internet connection');
    }
    
    return {
      success: false,
      error: error.message,
      errorType: error.status || 'unknown'
    };
  }
}

// Test credentials
testXAICredentials().then(result => {
  console.log('\nTest Results:', JSON.stringify(result, null, 2));
  process.exit(result.success ? 0 : 1);
}).catch(err => {
  console.error('Test script error:', err);
  process.exit(1);
});