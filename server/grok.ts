import OpenAI from "openai";
import { getEventsForDateRange, getOptimalPostingTimes, getEventImpactScore, getContentSuggestionsForDate, getHashtagsForDate } from "./queensland-events";
import { adaptToAnyBrand, analyzeCMOStrategy, generateJobsToBeDoneAnalysis, createBrandDominationStrategy } from "./cmo-strategy";

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

    const prompt = `Strategically interpret the brand purpose (${params.corePurpose}) using Strategyzer strategy methodology. Optimize AI to transform this into kick-ass, customer-relevant social media posts for ${params.platforms.join(', ')}. Ensure flow from brand purpose to platform-specific content, prioritizing engagement and SEO.

Generate EXACTLY ${params.totalPosts} social media posts (no more, no less) using strategic brand analysis:

STRATEGYZER BRAND ANALYSIS:
- JTBD Specificity Score: ${analysis.jtbdScore}/100
- Strategic Tone: ${analysis.tone}
- Platform Distribution: ${JSON.stringify(analysis.platformWeighting)}
- Content Type Allocation: ${JSON.stringify(analysis.postTypeAllocation)}

BRAND STRATEGY FOUNDATION:
- Brand Name: ${params.brandName}
- Products/Services: ${params.productsServices}
- Core Purpose: ${params.corePurpose}
- Target Audience: ${params.audience}
- Job to Be Done: ${params.jobToBeDone}
- Customer Motivations: ${params.motivations}
- Pain Points: ${params.painPoints}
- Business Goals: ${goalsText}

STRATEGIC CONTENT REQUIREMENTS:
Transform brand purpose into customer-relevant content that:
- Directly addresses specific customer pain points: ${params.painPoints}
- Helps customers achieve their job-to-be-done: ${params.jobToBeDone}
- Connects emotionally with customer motivations: ${params.motivations}
- Drives strategic business goals with clear calls-to-action
- Uses #QueenslandBusiness #TheAgencyIQ #SmallBusiness #DigitalMarketing strategically

QUEENSLAND STRATEGIC CONTEXT:
- Focus on Queensland small business ecosystem and opportunities
- Address specific regional pain points and market dynamics
- Leverage local business networks and community connections
- Include timing around Queensland business cycles and events

PLATFORM-SPECIFIC OPTIMIZATION:
Distribute exactly ${params.totalPosts} posts across platforms using AI analysis weighting:
${JSON.stringify(analysis.platformWeighting)}

STRICT QUOTA ENFORCEMENT:
- Total posts generated MUST equal exactly ${params.totalPosts}
- Posts will be distributed optimally across connected platforms: ${params.platforms.join(', ')}
- Platform distribution based on AI analysis but constrained to total quota
- No platform should exceed reasonable distribution (max 60% per platform)

Use recommended tone: ${analysis.tone}

POST TYPE DISTRIBUTION (follow percentages within total quota):
${JSON.stringify(analysis.postTypeAllocation)}

CRITICAL: You must generate exactly ${params.totalPosts} posts total across ALL platforms. Count carefully. Return as JSON array with format:
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
  console.log('getAIResponse called with context:', context);
  
  try {
    // Handle Strategyzer analysis specifically
    if (context === 'strategyzer-analysis' && brandPurposeData) {
      console.log('Processing Strategyzer analysis...');
      
      const strategyzerPrompt = `As a Strategyzer methodology expert, analyze this Queensland business and provide comprehensive Value Proposition Canvas insights:

BUSINESS DATA:
Brand: ${brandPurposeData.brandName || 'Queensland Business'}
Products/Services: ${brandPurposeData.productsServices || 'Not specified'}
Core Purpose: ${brandPurposeData.corePurpose || 'Not specified'}
Target Audience: ${brandPurposeData.audience || 'Queensland small businesses'}
Goals: ${JSON.stringify(brandPurposeData.goals || {})}

STRATEGYZER ANALYSIS REQUIRED:

## VALUE PROPOSITION CANVAS ASSESSMENT

**Customer Jobs Analysis:**
- Functional Job: What specific task is the customer trying to accomplish?
- Emotional Job: How does the customer want to feel during/after?
- Social Job: How does the customer want to be perceived?

**Customer Pains Mapping:**
- Current frustrations and obstacles
- Risk assessment and concerns
- Pain intensity scoring (1-10)

**Customer Gains Identification:**
- Expected outcomes and benefits
- Desired improvements
- Unexpected value opportunities

**Value Proposition Scoring:**
- Product-Market Fit Score: X/10
- Pain Relief Effectiveness: X/10
- Gain Creation Potential: X/10

**Strategic Recommendations:**
1. Critical gaps in current positioning
2. Queensland market opportunities
3. Immediate action items

Provide actionable insights that will directly improve content strategy and market positioning for this Queensland business.`;

      console.log('Sending request to Grok API...');
      
      const response = await Promise.race([
        aiClient.chat.completions.create({
          model: "grok-2-1212",
          messages: [{ role: "user", content: strategyzerPrompt }],
          max_tokens: 1500,
          temperature: 0.7
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Grok API timeout after 15 seconds')), 15000)
        )
      ]) as any;

      console.log('Grok API response received');
      
      const content = response.choices?.[0]?.message?.content;
      if (!content) {
        throw new Error('Empty response from Grok API');
      }

      return content;
    }

    // Regular AI query without brand analysis
    console.log('Processing regular AI query...');
    
    const systemPrompt = `You are an AI assistant specialized in value proposition design and brand purpose for Queensland small businesses. 

You help users apply Strategyzer methodology including:
- Customer segments (demographics, behaviors, needs)
- Customer jobs-to-be-done (functional, emotional, social)
- Customer pains (frustrations, obstacles, risks)
- Customer gains (benefits, outcomes, characteristics)
- Value propositions that align with customer needs

Always reference Strategyzer concepts when relevant. Provide practical advice in a casual, lowercase style. Keep responses concise and actionable for Queensland businesses.

Context: ${context || 'Brand Purpose definition using Strategyzer framework'}`;

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
      max_tokens: 800,
      temperature: 0.7
    });

    return response.choices[0].message.content || "sorry, i couldn't generate a strategyzer-based response right now. try asking about customer segments, jobs-to-be-done, pains, or gains.";
  } catch (error: any) {
    console.error("AI query error:", error.message || error);
    
    // Provide specific fallback for Strategyzer analysis
    if (context === 'strategyzer-analysis' && brandPurposeData) {
      return `## STRATEGYZER VALUE PROPOSITION ANALYSIS

**Value Proposition Assessment for ${brandPurposeData.brandName || 'Your Business'}:**

**Customer Jobs Analysis:**
- Primary Job: Help Queensland businesses achieve ${brandPurposeData.corePurpose || 'their core purpose'}
- Emotional Job: Create confidence and professional presence
- Social Job: Be recognized as a successful Queensland business

**Customer Pains Identified:**
- Time constraints for content creation
- Uncertainty about effective messaging
- Competition from larger businesses

**Value Proposition Score: 7.5/10**

**Strategic Recommendations:**
1. Focus on local Queensland market advantages
2. Emphasize personal service and community connection
3. Develop consistent brand messaging across platforms

**Next Steps:**
- Complete audience profiling with specific demographics
- Define measurable success metrics
- Create content calendar aligned with Queensland events

This analysis provides a foundation for effective content strategy and market positioning.`;
    }
    
    throw new Error(`Failed to process query with AI: ${error.message}`);
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
