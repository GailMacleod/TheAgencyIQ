import OpenAI from "openai";
import { calendarService, CalendarEvent, PLATFORM_SPECS, PlatformSpecification } from './calendar-service.js';
import { addDays, format } from 'date-fns';

// Initialize OpenAI for content generation instead of XAI/Grok
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || process.env.XAI_API_KEY 
});

export interface PlatformContent {
  platform: string;
  content: string;
  characterCount: number;
  hashtags: string[];
  mentions: string[];
  cta: string;
  eventId?: string;
  eventTitle?: string;
  scheduledFor: Date;
}

export interface ContentGenerationRequest {
  platforms: string[];
  eventContext?: 'upcoming' | 'trending' | 'specific';
  eventId?: string;
  businessFocus?: string;
  customPrompt?: string;
  targetAudience?: string[];
  contentStyle?: 'educational' | 'promotional' | 'engaging' | 'inspirational';
}

export class GrokCalendarService {
  private platformSpecs = PLATFORM_SPECS;

  constructor() {
    console.log('🤖 Grok Calendar Service initialized with live event integration');
  }

  /**
   * Generate platform-specific content based on Strategizer brand purpose waterfall
   */
  async generateEventDrivenContent(request: ContentGenerationRequest, brandPurpose?: any): Promise<PlatformContent[]> {
    try {
      console.log('🎯 Generating STRATEGIZER-DRIVEN content for platforms:', request.platforms);

      // Get relevant calendar events
      const events = this.getRelevantEvents(request);
      console.log(`📅 Found ${events.length} relevant events for content generation`);

      // Get brand purpose and strategy context
      const strategizerContext = await this.getStrategizerContext(brandPurpose);
      console.log('📊 STRATEGIZER CONTEXT:', strategizerContext.summary);

      const contentPromises = request.platforms.map(platform => 
        this.generatePlatformContent(platform, events, request, strategizerContext)
      );

      const results = await Promise.all(contentPromises);
      
      console.log('✅ Generated content for all platforms successfully');
      return results.filter(content => content !== null) as PlatformContent[];

    } catch (error) {
      console.error('❌ Error generating event-driven content:', error);
      return this.generateFallbackContent(request.platforms);
    }
  }

  /**
   * Get calendar events based on request context
   */
  private getRelevantEvents(request: ContentGenerationRequest): CalendarEvent[] {
    switch (request.eventContext) {
      case 'trending':
        return calendarService.getTrendingEvents();
      case 'specific':
        if (request.eventId) {
          const event = calendarService.getEventContext(request.eventId);
          return event ? [event.event, ...event.relatedEvents.slice(0, 2)] : [];
        }
        return [];
      case 'upcoming':
      default:
        return calendarService.getUpcomingEvents(7);
    }
  }

  /**
   * Generate content for a specific platform using OpenAI with Strategizer framework
   */
  private async generatePlatformContent(
    platform: string, 
    events: CalendarEvent[], 
    request: ContentGenerationRequest,
    strategizerContext?: any
  ): Promise<PlatformContent | null> {
    try {
      const platformSpec = this.platformSpecs[platform];
      if (!platformSpec) {
        console.warn(`⚠️ Unknown platform: ${platform}`);
        return null;
      }

      const primaryEvent = events[0];
      if (!primaryEvent) {
        console.warn(`⚠️ No events available for ${platform} content generation`);
        return null;
      }

      const prompt = this.buildContentPrompt(platform, platformSpec, primaryEvent, events, request, strategizerContext);
      
      console.log(`🚀 Generating ${platform} content with OpenAI...`);
      
      const response = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: this.getSystemPrompt(platform, platformSpec, strategizerContext)
          },
          {
            role: "user",
            content: prompt
          }
        ],
        max_tokens: 500,
        temperature: 0.8
      });

      const generatedContent = response.choices[0].message.content;
      if (!generatedContent) {
        throw new Error(`No content generated for ${platform}`);
      }

      return this.parseAndValidateContent(
        platform, 
        platformSpec, 
        generatedContent, 
        primaryEvent
      );

    } catch (error) {
      console.error(`❌ Error generating ${platform} content:`, error);
      return this.generatePlatformFallback(platform, events[0]);
    }
  }

  /**
   * Build comprehensive prompt with Strategizer brand purpose framework
   */
  private buildContentPrompt(
    platform: string,
    platformSpec: PlatformSpecification,
    primaryEvent: CalendarEvent,
    allEvents: CalendarEvent[],
    request: ContentGenerationRequest,
    strategizerContext?: any
  ): string {
    const eventDate = format(primaryEvent.date, 'MMMM do, yyyy');
    const relatedEvents = allEvents.slice(1, 3);
    
    // Build Strategizer-driven prompt
    const strategizerSection = strategizerContext ? `
STRATEGIZER BRAND PURPOSE FRAMEWORK:
BRAND VALUE PROPOSITION: "${strategizerContext.valueProposition}"
CORE PURPOSE: "${strategizerContext.summary}"
TARGET AUDIENCE: ${strategizerContext.audience}

CUSTOMER JOBS-TO-BE-DONE:
${strategizerContext.customerJobs.map((job: string) => `- ${job}`).join('\n')}

PAIN POINTS TO ADDRESS:
${strategizerContext.painPoints.map((pain: string) => `- ${pain}`).join('\n')}

GAIN CREATORS (Value We Deliver):
${strategizerContext.gainCreators.map((gain: string) => `- ${gain}`).join('\n')}

CUSTOMER MOTIVATIONS:
${strategizerContext.motivations.map((motivation: string) => `- ${motivation}`).join('\n')}

BRAND DOMINATION STRATEGY: ${strategizerContext.brandDomination}

STRATEGIZER CONTENT REQUIREMENTS:
- Content MUST align with the brand purpose and value proposition
- Address specific customer jobs-to-be-done in the context of this event
- Connect event opportunities to pain relief and gain creation
- Use customer motivation triggers in messaging
- Position brand as solution provider for stated customer jobs
- Every post must drive toward the brand domination strategy
` : `
BUSINESS FOCUS: Queensland SME automation and efficiency
TARGET MARKET: Small business owners seeking operational improvements
VALUE PROPOSITION: Professional automation solutions
`;
    
    return `
Create compelling ${platform} content that follows the complete Strategizer brand purpose waterfall strategy.

EVENT: "${primaryEvent.title}" - ${eventDate}
CONTEXT: ${primaryEvent.description}
LOCATION: ${primaryEvent.location || 'Various locations'}

${strategizerSection}

PLATFORM: ${platform}
Max characters: ${platformSpec.characterLimit}
Tone: ${platformSpec.tone}
${platform === 'x' ? 'CRITICAL: Use @ mentions only, NO hashtags allowed on X platform' : 'Include 2-3 relevant hashtags'}

STRATEGIC CONTENT FRAMEWORK:
1. Lead with a customer job-to-be-done that this event addresses
2. Connect the event to specific pain point relief mentioned in brand purpose
3. Highlight gain creators that align with brand value proposition
4. Use motivation triggers from customer analysis
5. Position as brand domination opportunity in Queensland market
6. Make it actionable toward the core brand purpose

BRAND-ALIGNED MESSAGING:
- How does this event serve our defined customer jobs?
- Which specific pain points can be addressed through event participation?
- What gains align with our value proposition and brand purpose?
- How does this advance our Queensland market domination strategy?

Return ONLY the post content following Strategizer framework, no quotes or formatting.`;
  }

  /**
   * Get system prompt for specific platform with Strategizer framework
   */
  private getSystemPrompt(platform: string, platformSpec: PlatformSpecification, strategizerContext?: any): string {
    const strategizerPrompt = strategizerContext ? `You are a Strategizer-certified social media copywriter who creates strategic content following the complete brand purpose waterfall methodology for ${platform}.

BRAND PURPOSE FOUNDATION:
- Value Proposition: "${strategizerContext.valueProposition}"  
- Core Purpose: "${strategizerContext.summary}"
- Target Audience: ${strategizerContext.audience}

STRATEGIZER FRAMEWORK REQUIREMENTS:
- Every post must align with the defined brand purpose and value proposition
- Address specific customer jobs-to-be-done from the framework
- Connect content to pain point relief and gain creation
- Use customer motivation triggers identified in the strategy
- Position brand as solution provider for stated customer jobs
- Drive toward the brand domination strategy` : `You are an expert social media copywriter specializing in ${platform} content for Queensland small businesses and entrepreneurs focused on automation and efficiency solutions.`;
    
    const platformGuidelines = {
      facebook: "Create community-focused content that encourages discussion and sharing. Use storytelling that aligns with customer motivations and jobs-to-be-done.",
      instagram: "Write visually-inspired content with strong aesthetic appeal. Focus on inspiration and lifestyle elements that create specific gains for target customers.",
      linkedin: "Maintain a professional tone with industry insights and business value. Position content as thought leadership that addresses customer pain points.",
      youtube: "Create enthusiastic video descriptions that tease valuable content and encourage subscriptions while serving customer jobs-to-be-done.",
      x: "Write concise, punchy content. NEVER use hashtags - they are strictly prohibited. Use @mentions instead when relevant. Address specific customer motivations."
    };

    return `${strategizerPrompt}

${platformGuidelines[platform as keyof typeof platformGuidelines] || 'Create engaging, platform-appropriate content.'}

CRITICAL RULES:
- Stay within the ${platformSpec.characterLimit} character limit
- Match the platform's ${platformSpec.tone} tone exactly
- ${platformSpec.hashtagsAllowed ? 'Include relevant hashtags' : 'NEVER use hashtags'}
- ${platformSpec.mentionsPreferred ? 'Use @mentions when appropriate' : 'Avoid @mentions unless specifically relevant'}
- Make content actionable and valuable for business owners
- Write in Australian English with local business context when relevant
- Follow the complete Strategizer waterfall: Brand Purpose → Customer Jobs → Pain Relief → Gain Creation → Market Domination`;
  }

  /**
   * Parse and validate generated content
   */
  private parseAndValidateContent(
    platform: string,
    platformSpec: PlatformSpecification,
    content: string,
    event: CalendarEvent
  ): PlatformContent {
    // Clean up the content
    let cleanContent = content.trim();
    
    // Remove any formatting markers
    cleanContent = cleanContent.replace(/^\*\*|\*\*$/g, '');
    cleanContent = cleanContent.replace(/^"|"$/g, '');
    
    // Validate character count
    if (cleanContent.length > platformSpec.characterLimit) {
      console.warn(`⚠️ Content too long for ${platform}, truncating...`);
      cleanContent = cleanContent.substring(0, platformSpec.characterLimit - 3) + '...';
    }

    // Extract hashtags and mentions
    const hashtags = cleanContent.match(/#\w+/g) || [];
    const mentions = cleanContent.match(/@\w+/g) || [];

    // Special validation for X platform (no hashtags allowed)
    if (platform === 'x' && hashtags.length > 0) {
      console.warn('⚠️ Removing hashtags from X content (policy violation)');
      cleanContent = cleanContent.replace(/#\w+/g, '').replace(/\s+/g, ' ').trim();
    }

    return {
      platform,
      content: cleanContent,
      characterCount: cleanContent.length,
      hashtags: platform === 'x' ? [] : hashtags,
      mentions,
      cta: platformSpec.cta,
      eventId: event.id,
      eventTitle: event.title,
      scheduledFor: new Date()
    };
  }

  /**
   * Generate fallback content when Grok AI fails
   */
  private generatePlatformFallback(platform: string, event?: CalendarEvent): PlatformContent {
    const platformSpec = this.platformSpecs[platform];
    const eventTitle = event?.title || 'Business Innovation';
    
    const fallbackTemplates = {
      facebook: `🚀 ${eventTitle} is happening soon! This is exactly the kind of innovation that's transforming small businesses across Australia. Are you ready to take advantage of these opportunities? ${platformSpec.cta}`,
      
      instagram: `✨ ${eventTitle} vibes! 💼 Smart business owners are always looking ahead to the next big opportunity. What's your next move? ${platformSpec.cta}`,
      
      linkedin: `${eventTitle} represents a significant opportunity for professional growth and business development. Forward-thinking leaders are already preparing for these industry shifts. ${platformSpec.cta}`,
      
      youtube: `🎥 ${eventTitle} is coming up and it's going to be HUGE for business owners! Get ready for some game-changing insights. ${platformSpec.cta}`,
      
      x: `${eventTitle} is happening! Smart businesses are already planning their next moves. @TheAgencyIQ helps you stay ahead of the curve. ${platformSpec.cta}`
    };

    const content = fallbackTemplates[platform as keyof typeof fallbackTemplates] || 
                   `Don't miss ${eventTitle}! ${platformSpec.cta}`;

    return {
      platform,
      content,
      characterCount: content.length,
      hashtags: platform === 'x' ? [] : [`#${eventTitle.replace(/\s+/g, '')}`],
      mentions: platform === 'x' ? ['@TheAgencyIQ'] : [],
      cta: platformSpec.cta,
      eventId: event?.id,
      eventTitle: event?.title,
      scheduledFor: new Date()
    };
  }

  /**
   * Generate fallback content for all platforms
   */
  private generateFallbackContent(platforms: string[]): PlatformContent[] {
    console.log('🔄 Generating fallback content for all platforms');
    return platforms.map(platform => this.generatePlatformFallback(platform));
  }

  /**
   * Get upcoming events for API endpoint
   */
  async getUpcomingEvents(days: number = 7): Promise<CalendarEvent[]> {
    return calendarService.getUpcomingEvents(days);
  }

  /**
   * Get trending events for API endpoint
   */
  async getTrendingEvents(): Promise<CalendarEvent[]> {
    return calendarService.getTrendingEvents();
  }

  /**
   * Get Strategizer brand purpose context for content generation
   */
  async getStrategizerContext(brandPurpose?: any): Promise<any> {
    try {
      if (!brandPurpose) {
        console.log('⚠️ No brand purpose provided - using default context');
        return {
          summary: 'Generic Queensland business automation',
          valueProposition: 'Helping Queensland SMEs automate their marketing',
          customerJobs: ['automate marketing', 'save time', 'grow business'],
          painPoints: ['manual posting', 'lack of consistency', 'time constraints'],
          gainCreators: ['automation', 'AI-powered content', 'multi-platform posting'],
          brandDomination: 'Queensland market leadership in SME automation'
        };
      }

      // Extract Strategizer framework elements
      const context = {
        summary: brandPurpose.corePurpose || 'Brand purpose driven content',
        valueProposition: brandPurpose.productsServices || 'Professional services',
        customerJobs: [
          brandPurpose.jobToBeDone || 'solve business problems',
          'increase efficiency',
          'grow revenue'
        ],
        painPoints: brandPurpose.painPoints ? brandPurpose.painPoints.split(',').map((p: string) => p.trim()) : [
          'manual processes',
          'time constraints',
          'lack of automation'
        ],
        gainCreators: [
          'automation solutions',
          'AI-powered systems',
          'strategic consulting'
        ],
        motivations: brandPurpose.motivations ? brandPurpose.motivations.split(',').map((m: string) => m.trim()) : [
          'business growth',
          'competitive advantage',
          'operational efficiency'
        ],
        audience: brandPurpose.audience || 'Queensland small business owners',
        brandDomination: `${brandPurpose.brandName || 'Brand'} domination in Queensland market`
      };

      console.log('📊 STRATEGIZER CONTEXT BUILT:', context.summary);
      return context;
    } catch (error) {
      console.error('❌ Error building Strategizer context:', error);
      return {
        summary: 'Default business automation context',
        valueProposition: 'Queensland SME automation services',
        customerJobs: ['automate marketing', 'save time'],
        painPoints: ['manual processes', 'time constraints'],
        gainCreators: ['automation', 'AI systems'],
        brandDomination: 'Queensland market leadership'
      };
    }
  }

  /**
   * Get events by category
   */
  async getEventsByCategory(category: string): Promise<CalendarEvent[]> {
    return calendarService.getEventsByCategory(category);
  }

  /**
   * Preview content generation without actually creating posts
   */
  async previewEventContent(
    platforms: string[],
    eventId?: string
  ): Promise<{ event: CalendarEvent; content: PlatformContent[] }[]> {
    const events = eventId 
      ? [calendarService.getEventContext(eventId)?.event].filter(Boolean) as CalendarEvent[]
      : calendarService.getUpcomingEvents(3);

    const previews = [];
    
    for (const event of events) {
      const request: ContentGenerationRequest = {
        platforms,
        eventContext: 'specific',
        eventId: event.id
      };
      
      const content = await this.generateEventDrivenContent(request);
      previews.push({ event, content });
    }

    return previews;
  }
}

export const grokCalendarService = new GrokCalendarService();