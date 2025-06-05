import OpenAI from "openai";

if (!process.env.XAI_API_KEY) {
  throw new Error("XAI_API_KEY environment variable must be set");
}

const grok = new OpenAI({ 
  baseURL: "https://api.x.ai/v1", 
  apiKey: process.env.XAI_API_KEY 
});

export interface ContentGenerationParams {
  brandName: string;
  productsServices: string;
  corePurpose: string;
  audience: string;
  jobToBeDone: string;
  motivations: string;
  painPoints: string;
  goals: any; // JSON object with goal flags and URLs
  logoUrl?: string;
  contactDetails: any; // JSON object with email and phone
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
    const goalsText = Object.entries(params.goals || {})
      .filter(([key, value]) => value === true)
      .map(([key]) => {
        switch (key) {
          case 'driveTraffic': return `Drive traffic to website: ${params.goals.websiteUrl || 'website'}`;
          case 'buildBrand': return 'Build brand awareness';
          case 'makeSales': return `Make sales: ${params.goals.salesUrl || 'shop'}`;
          case 'informEducate': return `Inform/educate: ${params.goals.keyMessage || 'share knowledge'}`;
          default: return key;
        }
      })
      .join(', ');

    const prompt = `Generate ${params.totalPosts} social media posts for a Queensland business using comprehensive Strategyzer framework data:

Brand Identity:
- Brand Name: ${params.brandName}
- Products/Services: ${params.productsServices}
- Core Purpose: ${params.corePurpose}

Customer Understanding:
- Target Audience: ${params.audience}
- Job to Be Done: ${params.jobToBeDone}
- Audience Motivations: ${params.motivations}
- Pain Points: ${params.painPoints}

Business Goals: ${goalsText}

Contact Information:
- Email: ${params.contactDetails?.email || 'contact email'}
- Phone: ${params.contactDetails?.phone || 'contact phone'}

Connected platforms: ${params.platforms.join(', ')}

Create engaging, brand-aligned content that addresses audience motivations and pain points. Each post should include brand name naturally, reference products/services, and align with the job-to-be-done insights. Include appropriate URLs and contact details based on goals.

Distribute posts evenly across the connected platforms over 30 days starting June 6, 2025 at 9:00 AM AEST.

Return as JSON object with "posts" array containing objects with fields: platform, content, scheduledFor (ISO date string).

Make content authentic to Queensland culture and specifically tailored to the target audience.`;

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
