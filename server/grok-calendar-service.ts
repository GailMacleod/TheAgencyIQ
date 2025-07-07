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
    
    // Platform-specific copywriting guides
    const platformMastery = {
      facebook: "FACEBOOK MASTERY: Conversational storytelling. Start with relatable struggle, build community connection, ask engaging questions, create tribal FOMO. Be the business mate with insider knowledge.",
      instagram: "INSTAGRAM MASTERY: Visual lifestyle storytelling. Aspirational transformation narrative, behind-the-scenes success, powerful emotional triggers, create desire and urgency for business upgrade.",
      linkedin: "LINKEDIN MASTERY: Authority thought leadership. Industry expert dropping knowledge bombs, data-driven insights, contrarian professional wisdom, network-expanding shareable content.",
      youtube: "YOUTUBE MASTERY: Educational preview mastery. Create massive curiosity gaps, tease game-changing insights, preview transformation, subscription-driving anticipation building.",
      x: "X MASTERY: Sharp viral wisdom. Provocative truth bombs, contrarian business insights, quotable authority statements, conversation-starting controversial takes. ZERO hashtags."
    };

    return `
Generate KILLER ${platform} content using complete Strategizer brand purpose waterfall methodology.

EVENT DETAILS:
"${primaryEvent.title}" - ${eventDate}
Context: ${primaryEvent.description}
Location: ${primaryEvent.location || 'Various Queensland locations'}

${strategizerSection}

${platformMastery[platform as keyof typeof platformMastery]}

PLATFORM SPECIFICATIONS:
- MAXIMUM ${platformSpec.characterLimit} characters (count every character)
- Tone: ${platformSpec.tone} AF - no mixed messaging
- ${platform === 'x' ? 'ZERO hashtags - use @ mentions strategically' : 'Include 2-3 laser-targeted hashtags'}
- Australian English with Queensland business context

STRATEGIZER COPYWRITING WATERFALL (MANDATORY SEQUENCE):
1. HOOK: Address specific customer job-to-be-done (first 5-10 words)
2. PAIN AGITATION: Connect event to defined pain points (invisibility killing growth)
3. GAIN DEMONSTRATION: Show specific value aligned with brand proposition  
4. MOTIVATION TRIGGER: Use customer motivations from framework
5. DOMINATION POSITIONING: Position as Queensland market advantage
6. ACTION DRIVER: Clear CTA toward brand purpose fulfillment

KICK-ASS COPYWRITING REQUIREMENTS:
- Stop-scroll attention grab in opening line
- Specific, measurable business outcomes mentioned
- Create curiosity gap that demands engagement
- Include social proof or credibility element
- Power words that trigger emotion and action
- Urgency without being sleazy or pushy
- Write like conversion copywriter, not content creator
- Address real SME pain points that keep owners awake
- Position AgencyIQ as unfair competitive advantage

CORE BRAND MESSAGE INTEGRATION:
"Good businesses die quietly from invisibility. Professional, strategic, automated presence = validation = growth."

Return ONLY the final post content - no quotes, no explanations, pure copywriting gold.`;
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
      facebook: "FACEBOOK TONE: Conversational, community-driven, story-telling master. Be relatable, ask engaging questions, create FOMO. Use casual Australian slang where appropriate. Build tribal connection. Make people want to comment and share. Be the mate who always has the best business advice.",
      instagram: "INSTAGRAM TONE: Visual storyteller, aspirational lifestyle curator. Write like you're documenting success stories. Be inspirational but authentic. Use power words that create desire and urgency. Think: behind-the-scenes success, transformation stories, lifestyle upgrade messaging.",
      linkedin: "LINKEDIN TONE: Industry authority, thought leader, corporate strategist. Be professional but not boring. Drop insider knowledge bombs. Position as the expert small business owners turn to for growth strategies. Authoritative, data-driven, results-focused.",
      youtube: "YOUTUBE TONE: Enthusiastic educator, value-packed preview master. Create curiosity gaps, tease valuable insights, build anticipation. Be the channel that delivers game-changing business content. Energetic but informative.",
      x: "X TONE: Sharp, witty, direct impact. No fluff, pure value in minimal words. Be the business guru who drops truth bombs. Controversial takes welcome if valuable. Think: viral business insights, contrarian wisdom, attention-grabbing one-liners. NEVER use hashtags."
    };

    return `${strategizerPrompt}

${platformGuidelines[platform as keyof typeof platformGuidelines] || 'Create engaging, platform-appropriate content.'}

CRITICAL COPYWRITING RULES:
- MAXIMUM ${platformSpec.characterLimit} characters - count every single character
- Match platform tone exactly - be ${platformSpec.tone} AF
- ${platformSpec.hashtagsAllowed ? 'Include relevant hashtags' : 'ZERO hashtags allowed - use @mentions instead'}
- ${platformSpec.mentionsPreferred ? 'Use @mentions strategically' : 'Minimal @mentions only when adding value'}
- Write Australian English with Queensland business context
- Follow Strategizer waterfall: Brand Purpose → Customer Jobs → Pain Relief → Gain Creation → Market Domination

KICK-ASS COPYWRITING TECHNIQUES:
- Open with attention-grabbing hooks that make people stop scrolling
- Use power words that trigger emotion and action
- Create curiosity gaps that demand engagement  
- Include specific, measurable outcomes when possible
- End with clear, compelling calls-to-action
- Write like a conversion copywriter, not a content creator
- Make every word count - trim ruthlessly
- Use contrarian angles that challenge conventional thinking
- Include social proof elements when relevant
- Create urgency without being sleazy

CONTENT MUST:
- Sound like it's written BY a business owner FOR business owners
- Address real pain points that keep SMEs awake at night
- Offer actionable insights they can implement immediately
- Position AgencyIQ as the unfair advantage they've been missing
- Drive toward the core message: visibility equals validation and growth`;
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
      facebook: `Your competitors are already planning for ${eventTitle}, but most Queensland businesses will miss this completely. Here's the brutal truth: visibility beats talent every single time. While they're scrambling last-minute, you could be positioned as THE authority in your space. Ready to stop being invisible? ${platformSpec.cta}`,
      
      instagram: `Behind the scenes at ${eventTitle}: The businesses that show up consistently are the ones that dominate. Not the smartest. Not the cheapest. The ones that never disappear. Queensland's best-kept business secret? Automated professional presence that works 24/7. Your move. ${platformSpec.cta}`,
      
      linkedin: `${eventTitle} insight: 73% of Queensland SMEs admit their biggest regret is "waiting too long to be visible." While your competition struggles with inconsistent messaging, industry leaders leverage systematic presence to capture market share. Strategic positioning starts now. ${platformSpec.cta}`,
      
      youtube: `Why most Queensland businesses will FAIL at ${eventTitle} (and how to be the exception): I see this pattern everywhere - brilliant business owners with incredible services, completely invisible to their ideal customers. This changes everything. ${platformSpec.cta}`,
      
      x: `${eventTitle} reality check: Your expertise means nothing if nobody sees it. Queensland's hidden advantage? @TheAgencyIQ automated visibility system. While competitors post randomly, you dominate systematically. ${platformSpec.cta}`
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