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
   * Generate platform-specific content based on upcoming calendar events
   */
  async generateEventDrivenContent(request: ContentGenerationRequest): Promise<PlatformContent[]> {
    try {
      console.log('🎯 Generating event-driven content for platforms:', request.platforms);

      // Get relevant calendar events
      const events = this.getRelevantEvents(request);
      console.log(`📅 Found ${events.length} relevant events for content generation`);

      const contentPromises = request.platforms.map(platform => 
        this.generatePlatformContent(platform, events, request)
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
   * Generate content for a specific platform using Grok AI
   */
  private async generatePlatformContent(
    platform: string, 
    events: CalendarEvent[], 
    request: ContentGenerationRequest
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

      const prompt = this.buildContentPrompt(platform, platformSpec, primaryEvent, events, request);
      
      console.log(`🚀 Generating ${platform} content with OpenAI...`);
      
      const response = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: this.getSystemPrompt(platform, platformSpec)
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
   * Build comprehensive prompt for Grok AI
   */
  private buildContentPrompt(
    platform: string,
    platformSpec: PlatformSpecification,
    primaryEvent: CalendarEvent,
    allEvents: CalendarEvent[],
    request: ContentGenerationRequest
  ): string {
    const eventDate = format(primaryEvent.date, 'MMMM do, yyyy');
    const relatedEvents = allEvents.slice(1, 3);
    
    return `
Create fresh, engaging ${platform} content for Queensland small businesses.

EVENT: "${primaryEvent.title}" - ${eventDate}
CONTEXT: ${primaryEvent.description}
LOCATION: ${primaryEvent.location || 'Various locations'}

PLATFORM: ${platform}
Max characters: ${platformSpec.characterLimit}
Tone: ${platformSpec.tone}
${platform === 'x' ? 'CRITICAL: Use @ mentions only, NO hashtags allowed on X platform' : 'Include 2-3 relevant hashtags'}

CONTENT STRATEGY:
- Connect this event to real business opportunities for Queensland SMEs
- Focus on automation, efficiency, and growth benefits
- Use ${platformSpec.tone} voice appropriate for ${platform}
- Stay under ${platformSpec.characterLimit} characters
- Be specific about business benefits, not generic
- Avoid overused phrases like "Brisbane Ekka" or repetitive messaging
- Make it actionable and valuable to small business owners

BUSINESS ANGLE:
- How does this event create opportunities?
- What specific benefits can businesses gain?
- How does automation/AI help small businesses capitalize?

Return ONLY the post content, no quotes or formatting.`;
  }

  /**
   * Get system prompt for specific platform
   */
  private getSystemPrompt(platform: string, platformSpec: PlatformSpecification): string {
    const basePrompt = `You are an expert social media copywriter specializing in ${platform} content for small businesses and entrepreneurs.`;
    
    const platformGuidelines = {
      facebook: "Create community-focused content that encourages discussion and sharing. Use storytelling and ask questions.",
      instagram: "Write visually-inspired content with strong aesthetic appeal. Focus on inspiration and lifestyle elements.",
      linkedin: "Maintain a professional tone with industry insights and business value. Position content as thought leadership.",
      youtube: "Create enthusiastic video descriptions that tease valuable content and encourage subscriptions.",
      x: "Write concise, punchy content. NEVER use hashtags - they are strictly prohibited. Use @mentions instead when relevant."
    };

    return `${basePrompt}

${platformGuidelines[platform as keyof typeof platformGuidelines] || 'Create engaging, platform-appropriate content.'}

CRITICAL RULES:
- Stay within the ${platformSpec.characterLimit} character limit
- Match the platform's ${platformSpec.tone} tone exactly
- ${platformSpec.hashtagsAllowed ? 'Include relevant hashtags' : 'NEVER use hashtags'}
- ${platformSpec.mentionsPreferred ? 'Use @mentions when appropriate' : 'Avoid @mentions unless specifically relevant'}
- Make content actionable and valuable for business owners
- Write in Australian English with local business context when relevant`;
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