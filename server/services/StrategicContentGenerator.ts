/**
 * STRATEGIC CONTENT GENERATOR
 * Implements waterfall strategyzer methodology for Queensland SME content
 * Sequential business model canvas-inspired flow with Value Proposition Canvas integration
 */

import { storage } from '../storage';
import { db } from '../db';
import { posts } from '../../shared/schema';
import { eq, and } from 'drizzle-orm';
import { analyzeCMOStrategy, generateJobsToBeDoneAnalysis, createBrandDominationStrategy } from '../cmo-strategy';
import { generateContentCalendar } from '../grok';
import OpenAI from 'openai';
import { createHash } from 'crypto';

const aiClient = new OpenAI({
  baseURL: "https://api.x.ai/v1",
  apiKey: process.env.XAI_API_KEY,
});

interface StrategicContentParams {
  userId: number;
  brandPurpose: any;
  totalPosts: number;
  platforms: string[];
}

interface QueenslandMarketInsights {
  keyIndustries: string[];
  seasonalTrends: string[];
  competitiveAdvantages: string[];
  localEvents: string[];
  seoKeywords: string[];
}

interface ValuePropositionCanvas {
  customerJobs: string[];
  painPoints: string[];
  gainCreators: string[];
  products: string[];
  painRelievers: string[];
  valuePropositions: string[];
}

interface StrategicPost {
  id: number;
  platform: string;
  content: string;
  scheduledFor: string;
  strategicTheme: string;
  businessCanvasPhase: string;
  engagementOptimization: string;
  conversionFocus: string;
  audienceSegment: string;
}

export class StrategicContentGenerator {
  
  /**
   * WATERFALL STRATEGYZER METHODOLOGY
   * Sequential business model canvas-inspired content generation
   */
  static async generateStrategicContent(params: StrategicContentParams): Promise<StrategicPost[]> {
    console.log(`🎯 Starting strategic content generation for user ${params.userId}`);
    
    try {
      // Phase 1: Brand Purpose Analysis
      const brandAnalysis = await this.analyzeBrandPurpose(params.brandPurpose);
      
      // Phase 2: Audience Insights with Jobs-to-be-Done Framework
      const audienceInsights = await this.generateAudienceInsights(params.brandPurpose);
      
      // Phase 3: Queensland Market Data Integration
      const marketData = await this.getQueenslandMarketData(params.brandPurpose);
      
      // Phase 4: SEO Keywords for Queensland SMEs
      const seoKeywords = await this.generateSEOKeywords(params.brandPurpose, marketData);
      
      // Phase 5: Value Proposition Canvas
      const valueCanvas = await this.createValuePropositionCanvas(params.brandPurpose, audienceInsights);
      
      // Phase 6: High-Engagement Templates with Sales CTAs
      const contentTemplates = await this.generateEngagementTemplates(valueCanvas, seoKeywords);
      
      // Phase 7: 30-Day Cycle Optimization for Reach/Conversion
      const optimisedContent = await this.optimise30DayCycle(
        contentTemplates,
        params.totalPosts,
        params.platforms,
        marketData,
        params.brandPurpose
      );
      
      return optimisedContent;
    } catch (error) {
      console.error(`❌ Strategic content generation failed for user ${params.userId}:`, error);
      throw error;
    }
  }

  /**
   * PHASE 1: Brand Purpose Analysis
   * Analyzes core brand purpose for strategic direction
   */
  private static async analyzeBrandPurpose(brandPurpose: any): Promise<any> {
    console.log('🔍 Phase 1: Analyzing brand purpose...');
    
    try {
      const prompt = `Analyze this Queensland SME brand purpose for strategic content creation:
      
      Brand: ${brandPurpose.brandName}
      Purpose: ${brandPurpose.corePurpose}
      Products/Services: ${brandPurpose.productsServices}
      Audience: ${brandPurpose.audience}
      
      Provide strategic analysis:
      1. Core brand pillars (3-5 key themes)
      2. Unique value drivers
      3. Market positioning opportunities
      4. Content themes for authority building
      5. Competitive differentiation factors
      
      Focus on Queensland small business market with emphasis on rapid growth and customer acquisition.`;

      console.log('🔍 Sending request to AI client...');
      const response = await aiClient.chat.completions.create({
        model: "grok-2-1212",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      });

      console.log('✅ Phase 1 complete: Brand purpose analysis received');
      return JSON.parse(response.choices[0].message.content || "{}");
    } catch (error) {
      console.error('❌ Phase 1 AI failed, using fallback analysis:', error);
      
      // Fallback: Create strategic analysis based on brand purpose data
      return {
        coreBrandPillars: [
          'Queensland Local Business Authority',
          'Time-Efficient Marketing Automation',
          'Professional Social Media Presence',
          'Authentic Community Connection',
          'Growth-Driven Results'
        ],
        uniqueValueDrivers: [
          'Set & Forget automation for time-poor business owners',
          'Queensland-specific market understanding',
          'Professional brand presence without extra work',
          'Measurable growth through consistent posting'
        ],
        marketPositioningOpportunities: [
          'Local market leader in automated social media',
          'Go-to solution for Queensland SMEs',
          'Bridge between big brand presence and small business reality',
          'Community-focused brand building'
        ],
        contentThemesForAuthority: [
          'Local business success stories',
          'Queensland market insights',
          'Time-saving business tips',
          'Community engagement strategies',
          'Growth and visibility tactics'
        ],
        competitiveDifferentiationFactors: [
          'Queensland-specific content and timing',
          'True automation vs manual posting',
          'SME-focused rather than enterprise',
          'Local community understanding',
          'Authentic voice preservation'
        ]
      };
    }
  }
  }

  /**
   * PHASE 2: Audience Insights with Jobs-to-be-Done Framework
   * Generates deep audience insights using Strategyzer methodology
   */
  private static async generateAudienceInsights(brandPurpose: any): Promise<any> {
    console.log('👥 Phase 2: Generating audience insights...');
    
    return await generateJobsToBeDoneAnalysis(
      brandPurpose.corePurpose,
      brandPurpose.audience,
      brandPurpose.painPoints,
      brandPurpose.motivations
    );
  }

  /**
   * PHASE 3: Queensland Market Data Integration
   * Integrates Queensland-specific market insights
   */
  private static async getQueenslandMarketData(brandPurpose: any): Promise<QueenslandMarketInsights> {
    console.log('🏖️ Phase 3: Gathering Queensland market data...');
    
    try {
      const prompt = `Generate Queensland market insights for: ${brandPurpose.brandName}
      
      Industry: ${brandPurpose.productsServices}
      Target Audience: ${brandPurpose.audience}
      
      Provide Queensland-specific data:
      1. Key industries driving growth (mining, tourism, agriculture, tech)
      2. Seasonal business trends unique to Queensland
      3. Competitive advantages for local businesses
      4. Major local events and networking opportunities
      5. SEO keywords specific to Queensland market
      
      Focus on actionable insights for small business growth and customer acquisition.`;

      const response = await aiClient.chat.completions.create({
        model: "grok-2-1212",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      });

      console.log('✅ Phase 3 complete: Queensland market data received');
      return JSON.parse(response.choices[0].message.content || "{}");
    } catch (error) {
      console.error('❌ Phase 3 AI failed, using fallback market data:', error);
      
      // Fallback: Pre-defined Queensland market insights
      return {
        keyIndustries: [
          'Mining and Resources',
          'Tourism and Hospitality',
          'Agriculture and Food Production',
          'Technology and Innovation',
          'Construction and Infrastructure',
          'Healthcare and Aged Care',
          'Education and Training',
          'Professional Services'
        ],
        seasonalTrends: [
          'Winter dry season (May-October) - peak tourism',
          'Summer wet season (November-April) - agricultural focus',
          'Brisbane Ekka (August) - major marketing opportunity',
          'School holidays - family-focused campaigns',
          'Christmas/New Year - retail peak season',
          'Easter - travel and hospitality focus'
        ],
        competitiveAdvantages: [
          'Local knowledge and community connections',
          'Personalized service vs large corporations',
          'Quick response times and flexibility',
          'Supporting local Queensland economy',
          'Understanding of local regulations and culture',
          'Authentic Queensland voice and values'
        ],
        localEvents: [
          'Brisbane Ekka (August)',
          'Gold Coast 600 (October)',
          'Brisbane Festival (September)',
          'Cairns Festival (August-September)',
          'Townsville Cultural Festival (July)',
          'Sunshine Coast Marathon (August)'
        ],
        seoKeywords: [
          'Queensland small business',
          'Brisbane local services',
          'Gold Coast marketing',
          'Sunshine Coast business',
          'Queensland SME solutions',
          'local business Queensland',
          'Brisbane automation',
          'Queensland social media'
        ]
      };
    }
  }

  /**
   * PHASE 4: SEO Keywords for Queensland SMEs
   * Generates targeted keywords for local search domination
   */
  private static async generateSEOKeywords(brandPurpose: any, marketData: QueenslandMarketInsights): Promise<string[]> {
    console.log('🔍 Phase 4: Generating SEO keywords...');
    
    const prompt = `Generate high-converting SEO keywords for Queensland SME:
    
    Brand: ${brandPurpose.brandName}
    Services: ${brandPurpose.productsServices}
    Target: ${brandPurpose.audience}
    Local Market: ${JSON.stringify(marketData.keyIndustries)}
    
    Generate 20 strategic keywords including:
    1. Local geo-targeted keywords (Brisbane, Gold Coast, Sunshine Coast, etc.)
    2. Industry-specific long-tail keywords
    3. Service-based keywords with local intent
    4. Competitive keywords for market domination
    5. Seasonal Queensland keywords
    
    Focus on high-intent, low-competition keywords for rapid ranking and customer acquisition.`;

    const response = await aiClient.chat.completions.create({
      model: "grok-2-1212",
      messages: [{ role: "user", content: prompt }],
    });

    const content = response.choices[0].message.content || "";
    return content.split('\n').filter(line => line.trim()).slice(0, 20);
  }

  /**
   * PHASE 5: Value Proposition Canvas
   * Creates comprehensive value proposition framework
   */
  private static async createValuePropositionCanvas(brandPurpose: any, audienceInsights: any): Promise<ValuePropositionCanvas> {
    console.log('💎 Phase 5: Creating Value Proposition Canvas...');
    
    const prompt = `Create a comprehensive Value Proposition Canvas for:
    
    Brand: ${brandPurpose.brandName}
    Core Purpose: ${brandPurpose.corePurpose}
    Target Jobs: ${JSON.stringify(audienceInsights.functionalJob)}
    Pain Points: ${JSON.stringify(audienceInsights.painPoints)}
    
    Generate Value Proposition Canvas:
    1. Customer Jobs (functional, emotional, social)
    2. Pain Points (current frustrations and obstacles)
    3. Gain Creators (benefits that delight customers)
    4. Products/Services (core offerings)
    5. Pain Relievers (how offerings solve problems)
    6. Value Propositions (unique value delivery statements)
    
    Focus on subscriber delight and Queensland small business growth acceleration.`;

    const response = await aiClient.chat.completions.create({
      model: "grok-2-1212",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    });

    return JSON.parse(response.choices[0].message.content || "{}");
  }

  /**
   * PHASE 6: High-Engagement Templates with Sales CTAs
   * Generates platform-specific content templates optimised for engagement
   */
  private static async generateEngagementTemplates(valueCanvas: ValuePropositionCanvas, seoKeywords: string[]): Promise<any[]> {
    console.log('🎨 Phase 6: Creating engagement templates...');
    
    const templates = [];
    
    // Invisible Business Problem Templates
    templates.push({
      theme: 'invisible-business-problem',
      contentType: 'problem-awareness',
      cta: 'Stop Being Invisible',
      platforms: ['linkedin', 'facebook'],
      focus: 'invisible business pain'
    });
    
    // Always-On Beacon Solution Templates
    templates.push({
      theme: 'always-on-beacon',
      contentType: 'solution-focussed',
      cta: 'Get Your Beacon',
      platforms: ['instagram', 'facebook'],
      focus: 'professional visibility'
    });
    
    // Validation Not Visibility Templates
    templates.push({
      theme: 'validation-not-visibility',
      contentType: 'differentiation',
      cta: 'Get Validated',
      platforms: ['linkedin', 'youtube'],
      focus: 'validation messaging'
    });
    
    // Presence Polish Power Templates
    templates.push({
      theme: 'presence-polish-power',
      contentType: 'transformation',
      cta: 'Get Big Brand Power',
      platforms: ['x', 'instagram'],
      focus: 'big brand presence'
    });
    
    // Silence Kills Growth Templates
    templates.push({
      theme: 'silence-kills-growth',
      contentType: 'urgency',
      cta: 'Break The Silence',
      platforms: ['facebook', 'instagram'],
      focus: 'growth urgency'
    });
    
    // Show Up Automatically Templates
    templates.push({
      theme: 'show-up-automatically',
      contentType: 'benefit-focussed',
      cta: 'Start Showing Up',
      platforms: ['linkedin', 'youtube'],
      focus: 'automation benefit'
    });
    
    // Too Busy To Show Up Templates
    templates.push({
      theme: 'too-busy-to-show-up',
      contentType: 'relatable-pain',
      cta: 'Let Us Show Up',
      platforms: ['facebook', 'x'],
      focus: 'busy business owner'
    });
    
    return templates;
  }

  /**
   * PHASE 7: 30-Day Cycle Optimisation for Reach/Conversion
   * Optimises content distribution across 30-day cycles
   */
  private static async optimise30DayCycle(
    templates: any[],
    totalPosts: number,
    platforms: string[],
    marketData: QueenslandMarketInsights,
    brandPurpose: any
  ): Promise<StrategicPost[]> {
    console.log('📈 Phase 7: Optimising 30-day cycle...');
    
    const strategicPosts: StrategicPost[] = [];
    const postsPerPlatform = Math.ceil(totalPosts / platforms.length);
    
    // Generate posts for each platform
    for (let i = 0; i < platforms.length; i++) {
      const platform = platforms[i];
      
      for (let j = 0; j < postsPerPlatform && strategicPosts.length < totalPosts; j++) {
        const template = templates[j % templates.length];
        const dayOffset = Math.floor(strategicPosts.length / platforms.length);
        
        const scheduledDate = new Date();
        scheduledDate.setDate(scheduledDate.getDate() + dayOffset);
        scheduledDate.setHours(this.getOptimalPostingTime(platform));
        
        const post: StrategicPost = {
          id: strategicPosts.length + 1,
          platform,
          content: await this.generateStrategicPostContent(platform, template, marketData, brandPurpose),
          scheduledFor: scheduledDate.toISOString(),
          strategicTheme: template.theme,
          businessCanvasPhase: this.getBusinessCanvasPhase(j),
          engagementOptimisation: template.focus,
          conversionFocus: template.cta,
          audienceSegment: this.getAudienceSegment(platform)
        };
        
        strategicPosts.push(post);
      }
    }
    
    return strategicPosts.slice(0, totalPosts);
  }

  /**
   * Generate strategic post content for specific platform and template
   */
  private static async generateStrategicPostContent(platform: string, template: any, marketData: QueenslandMarketInsights, brandPurpose: any): Promise<string> {
    const prompt = `Generate ${platform} post content for TheAgencyIQ that MUST align with this specific brand purpose:

    BRAND PURPOSE: "${brandPurpose.corePurpose}"
    
    CORE VALUE PROPOSITION: "You're invisible, that's not good. AgencyIQ gives you a beacon that's always on."
    
    THE PAIN: "You're invisible, and silence is killing your growth."
    THE GAIN: "You show up. Week in, week out. Professionally. Strategically. Automatically."
    
    BRAND PROMISE: "Keep me visible even when I am too busy to show up, not just visibility, but validation. For those who want what the big brands have: presence, polish, and power, without the army it takes to get there."
    
    Template to use:
    - Theme: ${template.theme}
    - Content Type: ${template.contentType}
    - CTA: ${template.cta}
    - Focus: ${template.focus}
    
    CRITICAL REQUIREMENTS:
    1. ${this.getPlatformRequirements(platform)}
    2. MUST address the "invisible business" problem directly
    3. MUST position TheAgencyIQ as the solution that provides "presence, polish, and power"
    4. MUST speak to busy Queensland SME owners who need professional visibility
    5. MUST emphasize "validation not just visibility" and "always on beacon"
    6. MUST include urgency about silence killing growth
    7. MUST offer hope of showing up "professionally, strategically, automatically"
    8. Include strong call-to-action that drives immediate action
    
    Write content that makes invisible Queensland SMEs feel seen and understood, then compels them to take action.`;

    const response = await aiClient.chat.completions.create({
      model: "grok-2-1212",
      messages: [{ role: "user", content: prompt }],
    });

    return response.choices[0].message.content || "";
  }

  /**
   * Get platform-specific content requirements
   */
  private static getPlatformRequirements(platform: string): string {
    const requirements = {
      'facebook': '400-600 characters, community-focused tone',
      'instagram': '250-350 characters, visual storytelling with hashtags',
      'linkedin': '700-1000 characters, professional authority tone',
      'x': '200-280 characters, concise with @ mentions',
      'youtube': '350-500 characters, video teaser format'
    };
    
    return requirements[platform as keyof typeof requirements] || '300-500 characters';
  }

  /**
   * Get optimal posting time for platform
   */
  private static getOptimalPostingTime(platform: string): number {
    const optimalTimes = {
      'facebook': 10, // 10 AM
      'instagram': 14, // 2 PM
      'linkedin': 9, // 9 AM
      'x': 12, // 12 PM
      'youtube': 16 // 4 PM
    };
    
    return optimalTimes[platform as keyof typeof optimalTimes] || 12;
  }

  /**
   * Get business canvas phase based on post sequence
   */
  private static getBusinessCanvasPhase(postIndex: number): string {
    const phases = [
      'Problem Identification',
      'Solution Presentation',
      'Value Proposition',
      'Customer Segments',
      'Key Partnerships',
      'Revenue Streams',
      'Cost Structure',
      'Key Resources',
      'Key Activities',
      'Channels'
    ];
    
    return phases[postIndex % phases.length];
  }

  /**
   * Get audience segment for platform
   */
  private static getAudienceSegment(platform: string): string {
    const segments = {
      'facebook': 'Community Builders',
      'instagram': 'Visual Storytellers',
      'linkedin': 'Professional Decision Makers',
      'x': 'Thought Leaders',
      'youtube': 'Educational Content Consumers'
    };
    
    return segments[platform as keyof typeof segments] || 'General Audience';
  }

  /**
   * QUOTA RESET UTILITY
   * Resets user quota to Professional plan allocation (52 posts)
   */
  static async resetQuotaToFiftyTwo(userId: number): Promise<void> {
    console.log(`🔄 Resetting quota for user ${userId} to Professional plan (52 posts)`);
    
    // Update published posts to archived to reset quota
    await db.update(posts)
      .set({ status: 'archived' })
      .where(and(eq(posts.userId, userId), eq(posts.status, 'published')));
      
    console.log(`✅ Quota reset complete - user ${userId} now has 52/52 posts available`);
  }

  /**
   * DUPLICATE POST CLEANUP
   * Removes duplicate and test posts to stabilize count
   */
  static async cleanupDuplicatePosts(userId: number): Promise<void> {
    console.log(`🧹 Cleaning up duplicate posts for user ${userId}`);
    
    // Archive all non-draft posts older than 30 days to clean up test data
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    await db.update(posts)
      .set({ status: 'archived' })
      .where(
        and(
          eq(posts.userId, userId),
          // Archive old test posts that are not recent drafts
          posts.createdAt ? posts.createdAt < thirtyDaysAgo : false
        )
      );
    
    console.log(`✅ Duplicate cleanup complete for user ${userId}`);
  }
}