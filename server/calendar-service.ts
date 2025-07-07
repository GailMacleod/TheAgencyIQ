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
    
    // Generate dynamic calendar events starting TODAY and going forward
    this.events = [
      // Current and upcoming events
      {
        id: 'ai-automation-summit-today',
        title: 'AI Automation Summit 2025',
        description: 'Revolutionary AI tools transforming Australian small businesses - live demonstrations and practical implementation strategies',
        date: addDays(now, 0), // TODAY
        category: 'technology',
        location: 'Sydney Convention Centre / Virtual',
        hashtags: ['#AIAutomation', '#SmallBusiness', '#Innovation'],
        targetAudience: ['business-owners', 'entrepreneurs', 'tech-adopters'],
        businessRelevance: 10,
        urgency: 'high',
        platforms: ['linkedin', 'x', 'facebook']
      },
      {
        id: 'queensland-business-week-tomorrow',
        title: 'Queensland Small Business Week',
        description: 'Week-long celebration of Queensland entrepreneurs with grants, networking, and success stories',
        date: addDays(now, 1), // TOMORROW
        category: 'business',
        location: 'Queensland-wide',
        hashtags: ['#QLDBusiness', '#SmallBusinessWeek', '#Entrepreneurs'],
        targetAudience: ['queensland-businesses', 'entrepreneurs', 'local-communities'],
        businessRelevance: 10,
        urgency: 'high',
        platforms: ['facebook', 'instagram', 'linkedin']
      },
      {
        id: 'digital-marketing-revolution',
        title: 'Digital Marketing Revolution Conference',
        description: 'Latest AI-powered marketing strategies, social media automation, and customer engagement tactics',
        date: addDays(now, 2),
        category: 'marketing',
        location: 'Melbourne / Online',
        hashtags: ['#DigitalMarketing', '#AI', '#SocialMedia'],
        targetAudience: ['marketers', 'business-owners', 'agencies'],
        businessRelevance: 9,
        urgency: 'high',
        platforms: ['linkedin', 'x', 'youtube']
      },
      {
        id: 'brisbane-business-expo-this-week',
        title: 'Brisbane Business & Technology Expo',
        description: 'Queensland premier business exhibition featuring AI tools, automation solutions, and networking',
        date: addDays(now, 3),
        category: 'business',
        location: 'Brisbane Convention Centre',
        hashtags: ['#BrisbaneBusiness', '#TechExpo', '#Queensland'],
        targetAudience: ['queensland-businesses', 'tech-companies', 'entrepreneurs'],
        businessRelevance: 10,
        urgency: 'high',
        platforms: ['facebook', 'linkedin', 'instagram']
      },
      {
        id: 'automation-workshop-series',
        title: 'Business Automation Workshop Series',
        description: 'Hands-on workshops teaching small businesses how to implement automation for growth and efficiency',
        date: addDays(now, 4),
        category: 'technology',
        location: 'Multiple Locations / Virtual',
        hashtags: ['#BusinessAutomation', '#Workshop', '#SmallBusiness'],
        targetAudience: ['business-owners', 'operations-managers', 'entrepreneurs'],
        businessRelevance: 10,
        urgency: 'high',
        platforms: ['linkedin', 'youtube', 'x']
      },
      {
        id: 'social-media-mastery',
        title: 'Social Media Mastery for Small Business',
        description: 'Master social media strategies, content creation, and audience engagement for business growth',
        date: addDays(now, 5),
        category: 'marketing',
        location: 'Online',
        hashtags: ['#SocialMedia', '#ContentMarketing', '#BusinessGrowth'],
        targetAudience: ['small-business-owners', 'marketers', 'content-creators'],
        businessRelevance: 9,
        urgency: 'high',
        platforms: ['facebook', 'instagram', 'linkedin']
      },
      {
        id: 'customer-experience-summit',
        title: 'Customer Experience Excellence Summit',
        description: 'Transform your customer experience with AI-powered solutions and data-driven insights',
        date: addDays(now, 6),
        category: 'business',
        location: 'Melbourne/Virtual',
        hashtags: ['#CustomerExperience', '#CX', '#BusinessGrowth'],
        targetAudience: ['business-owners', 'customer-service-managers', 'marketers'],
        businessRelevance: 8,
        urgency: 'medium',
        platforms: ['linkedin', 'facebook', 'youtube']
      },
      {
        id: 'future-of-work-summit',
        title: 'Future of Work Summit Australia',
        description: 'Prepare your business for the future workplace with AI tools, remote collaboration, and productivity',
        date: addDays(now, 7),
        category: 'business',
        location: 'Sydney/Virtual',
        hashtags: ['#FutureOfWork', '#RemoteWork', '#Productivity'],
        targetAudience: ['hr-managers', 'business-owners', 'team-leaders'],
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