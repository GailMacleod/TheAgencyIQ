import OpenAI from "openai";
import { getEventsForDateRange, getOptimalPostingTimes, getEventImpactScore, getContentSuggestionsForDate, getHashtagsForDate } from "./queensland-events";

if (!process.env.XAI_API_KEY) {
  throw new Error("XAI_API_KEY environment variable must be set");
}

const aiClient = new OpenAI({ 
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

export interface BrandAnalysis {
  jtbdScore: number;
  platformWeighting: { [platform: string]: number };
  tone: string;
  postTypeAllocation: { [type: string]: number };
  suggestions: string[];
}

export async function analyzeBrandPurpose(params: ContentGenerationParams): Promise<BrandAnalysis> {
  try {
    const analysisPrompt = `Analyze this Queensland business brand purpose data and provide scoring/recommendations:

Brand: ${params.brandName}
Products/Services: ${params.productsServices}
Core Purpose: ${params.corePurpose}
Target Audience: ${params.audience}
Job to be Done: ${params.jobToBeDone}
Customer Motivations: ${params.motivations}
Pain Points: ${params.painPoints}
Business Goals: ${JSON.stringify(params.goals)}

Provide analysis in this exact JSON format:
{
  "jtbdScore": [0-100 score based on specificity and measurability],
  "platformWeighting": {
    "instagram": [percentage based on business type and audience],
    "linkedin": [percentage],
    "facebook": [percentage],
    "youtube": [percentage],
    "tiktok": [percentage]
  },
  "tone": "[vibrant/professional/thoughtful/energetic based on business type]",
  "postTypeAllocation": {
    "sales": [percentage if makeSales goal selected],
    "awareness": [percentage if buildBrand goal selected],
    "educational": [percentage if informEducate goal selected],
    "engagement": [percentage for community building]
  },
  "suggestions": [
    "Specific actionable suggestions for improving JTBD clarity",
    "Recommendations for better audience targeting",
    "Content strategy improvements"
  ]
}

Consider: Florists need vibrant tone, Instagram focus. Professional services need LinkedIn focus, professional tone. Book clubs need thoughtful tone, community focus.`;

    const response = await aiClient.chat.completions.create({
      model: "grok-2-1212",
      messages: [{ role: "user", content: analysisPrompt }],
      response_format: { type: "json_object" },
    });

    const analysis = JSON.parse(response.choices[0].message.content || "{}");
    console.log(`JTBD Score: ${analysis.jtbdScore}/100`);
    return analysis;
  } catch (error) {
    console.error("Brand analysis error:", error);
    // Fallback analysis
    return {
      jtbdScore: 50,
      platformWeighting: { instagram: 40, facebook: 30, linkedin: 20, youtube: 5, tiktok: 5 },
      tone: "professional",
      postTypeAllocation: { sales: 40, awareness: 30, educational: 20, engagement: 10 },
      suggestions: ["Consider making your Job to be Done more specific and measurable"]
    };
  }
}

export async function generateContentCalendar(params: ContentGenerationParams): Promise<GeneratedPost[]> {
  try {
    // First analyze the brand purpose
    const analysis = await analyzeBrandPurpose(params);
    
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

    const prompt = `Generate ${params.totalPosts} social media posts for a Queensland business using AI analysis results:

BRAND ANALYSIS RESULTS:
- JTBD Specificity Score: ${analysis.jtbdScore}/100
- Recommended Tone: ${analysis.tone}
- Platform Distribution: ${JSON.stringify(analysis.platformWeighting)}
- Post Type Allocation: ${JSON.stringify(analysis.postTypeAllocation)}

BUSINESS DATA:

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

QUEENSLAND MARKET CONTEXT:
- Focus on Queensland small business challenges and opportunities
- Include local events, networking opportunities, and market trends
- Address specific pain points of Queensland SMEs
- Leverage local community connections and business ecosystem

CONTENT STRATEGY REQUIREMENTS:
- Each post must directly address a specific pain point from: ${params.painPoints}
- Content should help audience achieve their job-to-be-done: ${params.jobToBeDone}
- Motivate action by connecting to audience motivations: ${params.motivations}
- Include clear calls-to-action based on business goals

PLATFORM-SPECIFIC OPTIMIZATION:
Distribute content across platforms based on AI analysis weighting:
${JSON.stringify(analysis.platformWeighting)}

Use recommended tone: ${analysis.tone}

POST TYPE DISTRIBUTION (follow percentages):
${JSON.stringify(analysis.postTypeAllocation)}

Generate exactly ${params.totalPosts} posts. Return as JSON array with format:
[
  {
    "platform": "platform_name",
    "content": "full_post_content_with_hashtags_and_urls",
    "scheduledFor": "2025-06-DD 14:00:00",
    "postType": "sales|awareness|educational|engagement",
    "aiScore": number_0_to_100,
    "targetPainPoint": "specific_pain_point_addressed",
    "jtbdAlignment": "how_this_helps_job_to_be_done"
  }
]

Ensure posts are scheduled across the next 30 days with optimal timing for each platform. Include relevant Queensland business hashtags and contact information where appropriate.

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

Distribute posts evenly across the connected platforms over 30 days starting June 10, 2025 at 9:00 AM AEST (Brisbane timezone).

Return as JSON object with "posts" array containing objects with fields: platform, content, scheduledFor (ISO date string).

Make content authentic to Queensland culture and specifically tailored to achieve the measurable targets for unpaid media success.`;

    const response = await aiClient.chat.completions.create({
      model: "grok-2-1212",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    const posts = result.posts || [];
    
    // Enforce strict subscription limit - truncate to exact totalPosts
    return posts.slice(0, params.totalPosts);
  } catch (error) {
    console.error("Content generation error:", error);
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

    const response = await aiClient.chat.completions.create({
      model: "grok-2-1212",
      messages: [{ role: "user", content: prompt }],
    });

    return response.choices[0].message.content || "New content generated for your Queensland business.";
  } catch (error) {
    console.error("Replacement post error:", error);
    throw new Error("Failed to generate replacement post");
  }
}

export async function getAIResponse(query: string, context?: string, brandPurposeData?: any): Promise<string> {
  try {
    let systemPrompt = `You are an AI assistant specialized in value proposition design and brand purpose for Queensland small businesses. 

You help users apply Strategyzer methodology including:
- Customer segments (demographics, behaviors, needs)
- Customer jobs-to-be-done (functional, emotional, social)
- Customer pains (frustrations, obstacles, risks)
- Customer gains (benefits, outcomes, characteristics)
- Value propositions that align with customer needs

Always reference Strategyzer concepts when relevant. Provide practical advice in a casual, lowercase style. Keep responses concise and actionable for Queensland businesses.

Context: ${context || 'Brand Purpose definition using Strategyzer framework'}`;

    // If brand purpose data is provided, analyze it and provide specific suggestions
    if (brandPurposeData) {
      const analysisPrompt = `Analyze this Queensland business brand purpose data and provide real-time suggestions for improvement:

Brand Name: ${brandPurposeData.brandName || 'Not specified'}
Products/Services: ${brandPurposeData.productsServices || 'Not specified'}
Core Purpose: ${brandPurposeData.corePurpose || 'Not specified'}
Target Audience: ${brandPurposeData.audience || 'Not specified'}
Job to be Done: ${brandPurposeData.jobToBeDone || 'Not specified'}
Customer Motivations: ${brandPurposeData.motivations || 'Not specified'}
Pain Points: ${brandPurposeData.painPoints || 'Not specified'}
Goals: ${JSON.stringify(brandPurposeData.goals || {})}

Provide specific suggestions for:
1. Making the Job to be Done more specific and measurable (e.g., "helps Queensland locals celebrate special moments with stunning floral arrangements, making gifting easy and memorable")
2. Improving audience targeting specificity
3. Enhancing pain point identification
4. Optimizing value proposition alignment

Focus on practical improvements that will lead to better content generation and platform performance.

User query: ${query}`;

      const response = await aiClient.chat.completions.create({
        model: "grok-2-1212",
        messages: [{ role: "user", content: analysisPrompt }],
      });

      return response.choices[0].message.content || "i need more specific information about your brand purpose to provide targeted suggestions. try filling out more details in each section.";
    }

    // Regular AI query without brand analysis
    const response = await aiClient.chat.completions.create({
      model: "grok-2-1212",
      messages: [
        {
          role: "system",
          content: systemPrompt
        },
        {
          role: "user",
          content: query
        }
      ],
    });

    return response.choices[0].message.content || "sorry, i couldn't generate a strategyzer-based response right now. try asking about customer segments, jobs-to-be-done, pains, or gains.";
  } catch (error) {
    console.error("AI query error:", error);
    throw new Error("Failed to process query with AI");
  }
}

export async function generateEngagementInsight(platform: string, timeSlot: string): Promise<string> {
  try {
    const prompt = `Generate a brief engagement insight tip for ${platform} posts scheduled at ${timeSlot} for Queensland small businesses. 
    Focus on why this timing works well and provide a specific, actionable recommendation.`;

    const response = await aiClient.chat.completions.create({
      model: "grok-2-1212",
      messages: [{ role: "user", content: prompt }],
    });

    return response.choices[0].message.content || `${platform} performs well at ${timeSlot} for Queensland businesses.`;
  } catch (error) {
    console.error("Insight generation error:", error);
    return `This post will maximize engagement—last cycle's data shows ${platform} performs best at ${timeSlot}`;
  }
}
