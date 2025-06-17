/**
 * Direct X.AI Credentials Test
 * Tests X.AI API key functionality without routing issues
 */

import { config } from 'dotenv';
config();

async function testXAICredentials() {
  console.log('🔑 Testing X.AI Credentials...');
  
  // Check if API key exists
  if (!process.env.XAI_API_KEY) {
    console.log('❌ XAI_API_KEY environment variable not found');
    return false;
  }
  
  console.log('✅ XAI_API_KEY found in environment');
  console.log('🔗 API Key format:', process.env.XAI_API_KEY.substring(0, 10) + '...');
  
  try {
    // Import OpenAI client configured for X.AI
    const { default: OpenAI } = await import('openai');
    
    const openai = new OpenAI({ 
      baseURL: "https://api.x.ai/v1", 
      apiKey: process.env.XAI_API_KEY 
    });
    
    console.log('🤖 Testing Grok API connection...');
    
    const response = await openai.chat.completions.create({
      model: "grok-2-1212",
      messages: [
        {
          role: "user",
          content: "Generate a brief business insight for Queensland small businesses. Keep it under 100 words."
        }
      ],
      max_tokens: 150
    });
    
    const insight = response.choices[0].message.content;
    
    console.log('✅ X.AI API connection successful!');
    console.log('📊 Generated insight:', insight);
    console.log('🔢 Token usage:', response.usage);
    
    return {
      success: true,
      insight: insight,
      usage: response.usage,
      model: "grok-2-1212"
    };
    
  } catch (error) {
    console.log('❌ X.AI API test failed:', error.message);
    
    if (error.message.includes('401')) {
      console.log('🔐 Authentication error - API key may be invalid or expired');
    } else if (error.message.includes('quota')) {
      console.log('📊 Quota exceeded - API usage limit reached');
    } else if (error.message.includes('network')) {
      console.log('🌐 Network error - check internet connection');
    }
    
    return {
      success: false,
      error: error.message,
      errorType: error.status || 'unknown'
    };
  }
}

// Test credentials if running directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testXAICredentials().then(result => {
    console.log('\n📋 Test Results:', JSON.stringify(result, null, 2));
    process.exit(result.success ? 0 : 1);
  });
}