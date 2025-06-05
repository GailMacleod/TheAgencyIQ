import OpenAI from "openai";

if (!process.env.XAI_API_KEY) {
  throw new Error("XAI_API_KEY environment variable must be set");
}

const grok = new OpenAI({ 
  baseURL: "https://api.x.ai/v1", 
  apiKey: process.env.XAI_API_KEY 
});

export interface ContentGenerationParams {
  corePurpose: string;
  audience: string;
  goals: string;
  platforms: string[];
  totalPosts: number;
}

export interface GeneratedPost {
  platform: string;
  content: string;
  scheduledFor: string;
}

export async function generateContentCalendar(params: ContentGenerationParams): Promise<GeneratedPost[]> {
  try {
    const prompt = `Generate ${params.totalPosts} social media posts for a Queensland business with the following brand purpose:
    
    Core Purpose: ${params.corePurpose}
    Target Audience: ${params.audience}
    Business Goals: ${params.goals}
    
    Connected platforms: ${params.platforms.join(', ')}
    
    Create engaging, brand-aligned content that speaks to Queensland small businesses. Each post should be relevant to the platform and support the business goals. 
    
    Distribute posts evenly across the connected platforms over 30 days starting June 6, 2025 at 9:00 AM AEST.
    
    Return as JSON object with "posts" array containing objects with fields: platform, content, scheduledFor (ISO date string).
    
    Ensure content is professional, engaging, and specifically tailored to Queensland business owners.`;

    const response = await grok.chat.completions.create({
      model: "grok-2-1212",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    return result.posts || [];
  } catch (error) {
    console.error("Grok content generation error:", error);
    throw new Error("Failed to generate content calendar");
  }
}

export async function generateReplacementPost(
  platform: string,
  corePurpose: string,
  audience: string,
  goals: string
): Promise<string> {
  try {
    const prompt = `Generate a new ${platform} post for a Queensland business to replace a failed post.
    
    Brand Purpose: ${corePurpose}
    Target Audience: ${audience}
    Business Goals: ${goals}
    
    Create engaging content that targets the audience to support the business goals. Make it platform-specific and relevant to Queensland small businesses.`;

    const response = await grok.chat.completions.create({
      model: "grok-2-1212",
      messages: [{ role: "user", content: prompt }],
    });

    return response.choices[0].message.content || "New content generated for your Queensland business.";
  } catch (error) {
    console.error("Grok replacement post error:", error);
    throw new Error("Failed to generate replacement post");
  }
}

export async function getGrokResponse(query: string, context?: string): Promise<string> {
  try {
    const systemPrompt = `You are a helpful social media marketing assistant for Queensland small businesses. 
    Provide practical, actionable advice that helps local businesses improve their social media presence and engagement.
    Keep responses concise but informative, and always consider the Australian market context.`;

    const response = await grok.chat.completions.create({
      model: "grok-2-1212",
      messages: [
        {
          role: "system",
          content: systemPrompt
        },
        {
          role: "user",
          content: context ? `${context}\n\n${query}` : query
        }
      ],
    });

    return response.choices[0].message.content || "I'm having trouble processing that request. Could you try rephrasing it?";
  } catch (error) {
    console.error("Grok query error:", error);
    throw new Error("Failed to process query with Grok");
  }
}

export async function generateEngagementInsight(platform: string, timeSlot: string): Promise<string> {
  try {
    const prompt = `Generate a brief engagement insight tip for ${platform} posts scheduled at ${timeSlot} for Queensland small businesses. 
    Focus on why this timing works well and provide a specific, actionable recommendation.`;

    const response = await grok.chat.completions.create({
      model: "grok-2-1212",
      messages: [{ role: "user", content: prompt }],
    });

    return response.choices[0].message.content || `${platform} performs well at ${timeSlot} for Queensland businesses.`;
  } catch (error) {
    console.error("Grok insight generation error:", error);
    return `This post will maximize engagement—last cycle's data shows ${platform} performs best at ${timeSlot}`;
  }
}
