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
          case 'driveTraffic': return `Drive traffic to website: ${params.goals.websiteUrl || 'website'} (Target: ${params.goals.trafficTarget || 'increase monthly visitors'})`;
          case 'buildBrand': return `Build brand awareness (Targets: ${params.goals.followerTarget || 'grow followers'}, ${params.goals.reachTarget || 'increase reach'})`;
          case 'makeSales': return `Generate sales: ${params.goals.salesUrl || 'shop'} (Targets: ${params.goals.salesTarget || 'increase revenue'}, ${params.goals.conversionTarget || 'improve conversion rate'})`;
          case 'generateLeads': return `Generate leads (Targets: ${params.goals.leadTarget || 'qualified leads'}, ${params.goals.engagementTarget || 'engagement rate'})`;
          case 'informEducate': return `Inform/educate: ${params.goals.keyMessage || 'share knowledge'} (Target: ${params.goals.educationTarget || 'reach more people'})`;
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

UNPAID MEDIA BEST PRACTICES - Include measurable elements:
- Clear calls-to-action that align with specific targets (traffic, followers, sales, leads, education)
- Content designed to drive measurable engagement (comments, shares, saves, clicks)
- Educational content that can be tracked for reach and engagement
- Community-building posts that encourage user-generated content
- Behind-the-scenes content that builds authentic connections
- Local Queensland references to increase regional engagement
- Seasonal and timely content for higher organic reach
- Hashtag strategies for discoverability without paid promotion
- Content formats proven for organic reach (carousels, videos, stories)

Each post should be optimized for organic reach and designed to achieve the specific measurable targets outlined in the goals.

Distribute posts evenly across the connected platforms over 30 days starting June 6, 2025 at 9:00 AM AEST.

Return as JSON object with "posts" array containing objects with fields: platform, content, scheduledFor (ISO date string).

Make content authentic to Queensland culture and specifically tailored to achieve the measurable targets for unpaid media success.`;

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
