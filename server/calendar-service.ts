import { addDays, format, isAfter, isBefore, startOfDay, endOfDay } from 'date-fns';

export interface CalendarEvent {
  id: string;
  title: string;
  description: string;
  date: Date;
  category: 'business' | 'technology' | 'marketing' | 'industry' | 'seasonal' | 'awareness';
  location?: string;
  hashtags: string[];
  targetAudience: string[];
  businessRelevance: number; // 1-10 scale
  urgency: 'low' | 'medium' | 'high';
  platforms: string[];
}

export interface PlatformSpecification {
  name: string;
  characterLimit: number;
  tone: string;
  hashtagsAllowed: boolean;
  mentionsPreferred: boolean;
  contentStyle: string;
  cta: string;
}

export const PLATFORM_SPECS: Record<string, PlatformSpecification> = {
  facebook: {
    name: 'Facebook',
    characterLimit: 8000,
    tone: 'community-focused, engaging, conversational',
    hashtagsAllowed: true,
    mentionsPreferred: false,
    contentStyle: 'storytelling with community engagement',
    cta: 'Like, comment, or share your thoughts!'
  },
  instagram: {
    name: 'Instagram',
    characterLimit: 2200,
    tone: 'visual-first, inspirational, lifestyle-focused',
    hashtagsAllowed: true,
    mentionsPreferred: false,
    contentStyle: 'visual storytelling with strong aesthetic appeal',
    cta: 'Double tap if you agree! 💫'
  },
  linkedin: {
    name: 'LinkedIn',
    characterLimit: 3000,
    tone: 'professional, authoritative, industry-focused',
    hashtagsAllowed: true,
    mentionsPreferred: false,
    contentStyle: 'professional insights and business value',
    cta: 'What are your thoughts? Let me know in the comments.'
  },
  youtube: {
    name: 'YouTube',
    characterLimit: 5000,
    tone: 'enthusiastic, educational, video-teaser focused',
    hashtagsAllowed: true,
    mentionsPreferred: false,
    contentStyle: 'video descriptions with educational value',
    cta: 'Subscribe for more insights!'
  },
  x: {
    name: 'X',
    characterLimit: 280,
    tone: 'concise, engaging, conversational',
    hashtagsAllowed: false, // X policy change - no hashtags allowed
    mentionsPreferred: true,
    contentStyle: 'concise insights with @ mentions only',
    cta: 'What do you think?'
  }
};

export class CalendarService {
  private events: CalendarEvent[] = [];

  constructor() {
    this.initializeEvents();
  }

  private initializeEvents(): void {
    const now = new Date();
    const nextMonth = addDays(now, 30);
    
    // Generate dynamic calendar events for the next 30 days
    this.events = [
      // Technology & Business Events
      {
        id: 'tech-innovation-summit',
        title: 'Global Technology Innovation Summit',
        description: 'Leading tech companies showcase breakthrough innovations in AI, automation, and digital transformation',
        date: addDays(now, 5),
        category: 'technology',
        location: 'Virtual/Sydney',
        hashtags: ['#TechInnovation', '#AI', '#DigitalTransformation'],
        targetAudience: ['business-owners', 'tech-enthusiasts', 'entrepreneurs'],
        businessRelevance: 9,
        urgency: 'high',
        platforms: ['linkedin', 'x', 'facebook']
      },
      {
        id: 'small-business-week',
        title: 'Small Business Week Australia',
        description: 'Celebrating and supporting small businesses across Australia with resources, networking, and recognition',
        date: addDays(now, 8),
        category: 'business',
        location: 'Australia-wide',
        hashtags: ['#SmallBusinessWeek', '#AustralianBusiness', '#Entrepreneurship'],
        targetAudience: ['small-business-owners', 'entrepreneurs', 'local-communities'],
        businessRelevance: 10,
        urgency: 'high',
        platforms: ['facebook', 'instagram', 'linkedin']
      },
      {
        id: 'digital-marketing-trends',
        title: 'Digital Marketing Trends 2025',
        description: 'Latest trends in digital marketing including AI-driven campaigns, personalization, and automation',
        date: addDays(now, 12),
        category: 'marketing',
        location: 'Online',
        hashtags: ['#DigitalMarketing', '#MarketingTrends', '#AI'],
        targetAudience: ['marketers', 'business-owners', 'agencies'],
        businessRelevance: 8,
        urgency: 'medium',
        platforms: ['linkedin', 'x', 'youtube']
      },
      {
        id: 'brisbane-business-expo',
        title: 'Brisbane Business & Technology Expo',
        description: 'Queensland\'s premier business exhibition featuring latest technologies and networking opportunities',
        date: addDays(now, 15),
        category: 'business',
        location: 'Brisbane, QLD',
        hashtags: ['#BrisbaneBusiness', '#BusinessExpo', '#Queensland'],
        targetAudience: ['queensland-businesses', 'tech-companies', 'entrepreneurs'],
        businessRelevance: 9,
        urgency: 'high',
        platforms: ['facebook', 'linkedin', 'instagram']
      },
      {
        id: 'automation-revolution',
        title: 'Business Automation Revolution',
        description: 'How automation is transforming small businesses and creating competitive advantages',
        date: addDays(now, 18),
        category: 'technology',
        location: 'Virtual',
        hashtags: ['#BusinessAutomation', '#Efficiency', '#SmallBusiness'],
        targetAudience: ['business-owners', 'operations-managers', 'entrepreneurs'],
        businessRelevance: 10,
        urgency: 'high',
        platforms: ['linkedin', 'youtube', 'x']
      },
      {
        id: 'customer-experience-summit',
        title: 'Customer Experience Excellence Summit',
        description: 'Strategies for delivering exceptional customer experiences in the digital age',
        date: addDays(now, 22),
        category: 'business',
        location: 'Melbourne/Virtual',
        hashtags: ['#CustomerExperience', '#CX', '#BusinessGrowth'],
        targetAudience: ['business-owners', 'customer-service-managers', 'marketers'],
        businessRelevance: 8,
        urgency: 'medium',
        platforms: ['linkedin', 'facebook', 'youtube']
      },
      {
        id: 'sustainability-business',
        title: 'Sustainable Business Practices Week',
        description: 'Focus on environmental responsibility and sustainable business practices for long-term success',
        date: addDays(now, 25),
        category: 'business',
        location: 'Australia-wide',
        hashtags: ['#SustainableBusiness', '#GreenBusiness', '#ESG'],
        targetAudience: ['business-owners', 'sustainability-officers', 'consumers'],
        businessRelevance: 7,
        urgency: 'medium',
        platforms: ['facebook', 'instagram', 'linkedin']
      },
      {
        id: 'workforce-future',
        title: 'Future of Work Conference',
        description: 'Exploring remote work, AI collaboration, and the evolving workplace landscape',
        date: addDays(now, 28),
        category: 'business',
        location: 'Sydney/Virtual',
        hashtags: ['#FutureOfWork', '#RemoteWork', '#WorkplaceTrends'],
        targetAudience: ['hr-managers', 'business-owners', 'remote-workers'],
        businessRelevance: 8,
        urgency: 'medium',
        platforms: ['linkedin', 'x', 'youtube']
      }
    ];
  }

  public getUpcomingEvents(days: number = 7): CalendarEvent[] {
    const now = new Date();
    const futureDate = addDays(now, days);
    
    return this.events.filter(event => 
      isAfter(event.date, now) && isBefore(event.date, futureDate)
    ).sort((a, b) => a.date.getTime() - b.date.getTime());
  }

  public getEventsByCategory(category: string): CalendarEvent[] {
    return this.events.filter(event => event.category === category);
  }

  public getHighRelevanceEvents(): CalendarEvent[] {
    return this.events.filter(event => event.businessRelevance >= 8);
  }

  public getEventsByPlatform(platform: string): CalendarEvent[] {
    return this.events.filter(event => event.platforms.includes(platform));
  }

  public getEventForDate(date: Date): CalendarEvent | null {
    const targetDate = startOfDay(date);
    return this.events.find(event => 
      startOfDay(event.date).getTime() === targetDate.getTime()
    ) || null;
  }

  public getTrendingEvents(): CalendarEvent[] {
    const now = new Date();
    const nextWeek = addDays(now, 7);
    
    return this.events
      .filter(event => isAfter(event.date, now) && isBefore(event.date, nextWeek))
      .filter(event => event.urgency === 'high')
      .sort((a, b) => b.businessRelevance - a.businessRelevance);
  }

  public getEventContext(eventId: string): {
    event: CalendarEvent;
    relatedEvents: CalendarEvent[];
    platformRecommendations: string[];
  } | null {
    const event = this.events.find(e => e.id === eventId);
    if (!event) return null;

    const relatedEvents = this.events.filter(e => 
      e.id !== eventId && 
      e.category === event.category &&
      Math.abs(e.date.getTime() - event.date.getTime()) < 7 * 24 * 60 * 60 * 1000
    );

    const platformRecommendations = Object.keys(PLATFORM_SPECS).filter(platform =>
      event.platforms.includes(platform)
    );

    return {
      event,
      relatedEvents,
      platformRecommendations
    };
  }

  public generateContentBrief(event: CalendarEvent, platform: string): {
    event: CalendarEvent;
    platformSpec: PlatformSpecification;
    contentAngles: string[];
    keyMessages: string[];
    callToAction: string;
  } {
    const platformSpec = PLATFORM_SPECS[platform];
    
    const contentAngles = [
      `How ${event.title} impacts your business`,
      `Key takeaways from ${event.title} for entrepreneurs`,
      `Why ${event.title} matters for your industry`,
      `Preparing for ${event.title} - what you need to know`,
      `${event.title} trends that will shape your business`
    ];

    const keyMessages = [
      `Stay ahead of industry trends with insights from ${event.title}`,
      `Transform your business by understanding ${event.description}`,
      `Don't miss out on the opportunities presented by ${event.title}`,
      `Join the conversation about ${event.title} and its impact`,
      `Leverage ${event.title} insights for competitive advantage`
    ];

    return {
      event,
      platformSpec,
      contentAngles,
      keyMessages,
      callToAction: platformSpec.cta
    };
  }
}

export const calendarService = new CalendarService();