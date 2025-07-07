/**
 * INTELLIGENT PROMPT SERVICE - SEEDANCE 1.0
 * Generates customer and brand-specific prompts for optimal visual content
 */

interface BrandContext {
  brandPurpose?: string;
  industry?: string;
  targetAudience?: string;
  businessType?: string;
  location?: string;
  products?: string[];
  tone?: string;
}

interface PlatformRequirements {
  platform: string;
  aspectRatio: string;
  duration?: string;
  style: string;
  engagement: string[];
}

export class IntelligentPromptService {
  
  /**
   * Generate dynamically adapted prompts based on brand purpose and platform
   */
  static generateBrandPrompt(brandContext: BrandContext, platform: string, contentType: string = 'promotional'): string {
    const platformReqs = this.getPlatformRequirements(platform);
    
    // Extract key elements from brand purpose
    const brandPurposeElements = this.extractBrandPurposeElements(brandContext.brandPurpose || '');
    const platformOptimizedPurpose = this.adaptBrandPurposeForPlatform(brandContext.brandPurpose || '', platform);
    
    const basePrompt = "Super Realism, High-resolution photograph, UHD, photorealistic, shot on a Sony A7III";
    
    // Dynamic brand-platform integration
    const brandElements = [
      platformOptimizedPurpose,
      this.getBrandPurposeVisualElements(brandContext.brandPurpose || '', platform),
      brandContext.businessType ? `${brandContext.businessType} professional` : 'business professional',
      brandContext.location ? `${brandContext.location} business environment` : 'modern workspace',
      this.getPlatformSpecificBrandElements(brandContext, platform)
    ].filter(Boolean).join(', ');
    
    const platformStyle = platformReqs.style;
    const brandAlignedEngagement = this.getBrandAlignedEngagementStyle(brandContext.brandPurpose || '', platform);
    
    return `${basePrompt}, ${brandElements}, ${platformStyle}, ${brandAlignedEngagement} --ar ${platformReqs.aspectRatio} --style raw --stylize 250`;
  }

  /**
   * Extract actionable elements from brand purpose
   */
  private static extractBrandPurposeElements(brandPurpose: string): string[] {
    const keywords = brandPurpose.toLowerCase();
    const elements = [];
    
    // Action-oriented elements
    if (keywords.includes('transform') || keywords.includes('change')) elements.push('transformation');
    if (keywords.includes('empower') || keywords.includes('enable')) elements.push('empowerment');
    if (keywords.includes('innovate') || keywords.includes('innovation')) elements.push('innovation');
    if (keywords.includes('simplify') || keywords.includes('streamline')) elements.push('simplification');
    if (keywords.includes('connect') || keywords.includes('community')) elements.push('connection');
    if (keywords.includes('growth') || keywords.includes('scale')) elements.push('growth');
    if (keywords.includes('quality') || keywords.includes('excellence')) elements.push('excellence');
    if (keywords.includes('sustainable') || keywords.includes('environment')) elements.push('sustainability');
    
    return elements;
  }

  /**
   * Adapt brand purpose for specific platform characteristics
   */
  private static adaptBrandPurposeForPlatform(brandPurpose: string, platform: string): string {
    const purposeAdaptations = {
      facebook: (purpose: string) => `community-focused ${purpose.toLowerCase()} with social impact elements`,
      instagram: (purpose: string) => `lifestyle-enhanced ${purpose.toLowerCase()} with aesthetic appeal`,
      linkedin: (purpose: string) => `professional ${purpose.toLowerCase()} with industry authority`,
      youtube: (purpose: string) => `educational ${purpose.toLowerCase()} with learning value`,
      x: (purpose: string) => `thought-leadership ${purpose.toLowerCase()} with trending relevance`
    };

    const adaptFn = purposeAdaptations[platform as keyof typeof purposeAdaptations];
    return adaptFn ? adaptFn(brandPurpose) : `business-focused ${brandPurpose.toLowerCase()}`;
  }

  /**
   * Generate visual elements that align with brand purpose
   */
  private static getBrandPurposeVisualElements(brandPurpose: string, platform: string): string {
    const keywords = brandPurpose.toLowerCase();
    
    // Purpose-driven visual elements
    if (keywords.includes('transform') || keywords.includes('innovation')) {
      return platform === 'instagram' ? 'cutting-edge design, futuristic elements' :
             platform === 'linkedin' ? 'modern technology, innovation showcase' :
             'transformation visual metaphors, progressive elements';
    }
    
    if (keywords.includes('empower') || keywords.includes('community')) {
      return platform === 'facebook' ? 'diverse team collaboration, community building' :
             platform === 'instagram' ? 'empowerment lifestyle, personal growth' :
             'leadership presence, team empowerment visuals';
    }
    
    if (keywords.includes('sustainable') || keywords.includes('environment')) {
      return platform === 'instagram' ? 'eco-friendly lifestyle, green aesthetics' :
             platform === 'linkedin' ? 'sustainable business practices, environmental responsibility' :
             'sustainability elements, environmental consciousness';
    }
    
    if (keywords.includes('quality') || keywords.includes('excellence')) {
      return platform === 'linkedin' ? 'premium quality demonstration, excellence standards' :
             platform === 'instagram' ? 'luxury aesthetics, high-end presentation' :
             'quality craftsmanship, attention to detail';
    }
    
    // Default based on platform
    return platform === 'instagram' ? 'premium lifestyle elements, aspirational aesthetics' :
           platform === 'facebook' ? 'relatable community elements, authentic interaction' :
           platform === 'linkedin' ? 'professional excellence, industry leadership' :
           'engaging visual storytelling, authentic representation';
  }

  /**
   * Get platform-specific brand elements
   */
  private static getPlatformSpecificBrandElements(brandContext: BrandContext, platform: string): string {
    const brandPurpose = brandContext.brandPurpose || '';
    
    const platformElements = {
      facebook: () => {
        if (brandPurpose.includes('community') || brandPurpose.includes('connect')) {
          return 'community gathering, social interaction, shared experiences';
        }
        return 'family-friendly environment, trustworthy presence, social engagement';
      },
      
      instagram: () => {
        if (brandPurpose.includes('lifestyle') || brandPurpose.includes('transform')) {
          return 'lifestyle transformation, aesthetic inspiration, visual storytelling';
        }
        return 'premium visual appeal, aspirational content, aesthetic excellence';
      },
      
      linkedin: () => {
        if (brandPurpose.includes('professional') || brandPurpose.includes('business')) {
          return 'executive presence, industry expertise, thought leadership';
        }
        return 'professional authority, business acumen, career advancement';
      },
      
      youtube: () => {
        if (brandPurpose.includes('education') || brandPurpose.includes('teach')) {
          return 'educational setup, learning environment, knowledge sharing';
        }
        return 'engaging presentation, tutorial-ready setup, educational value';
      },
      
      x: () => {
        if (brandPurpose.includes('innovation') || brandPurpose.includes('trend')) {
          return 'trending elements, innovative concepts, thought-provoking setup';
        }
        return 'conversation-starting elements, trending aesthetics, viral potential';
      }
    };

    const elementFn = platformElements[platform as keyof typeof platformElements];
    return elementFn ? elementFn() : 'professional business elements, brand consistency';
  }

  /**
   * Generate brand-aligned engagement style
   */
  private static getBrandAlignedEngagementStyle(brandPurpose: string, platform: string): string {
    const keywords = brandPurpose.toLowerCase();
    
    if (keywords.includes('empower') || keywords.includes('inspire')) {
      return platform === 'instagram' ? 'inspirational mood, motivational lighting, empowerment energy' :
             platform === 'linkedin' ? 'authoritative presence, inspiring leadership, professional motivation' :
             'motivational elements, inspiring composition, empowerment focus';
    }
    
    if (keywords.includes('innovate') || keywords.includes('future')) {
      return platform === 'x' ? 'futuristic elements, innovation showcase, forward-thinking design' :
             platform === 'linkedin' ? 'cutting-edge technology, innovation leadership, future-ready' :
             'innovative visual elements, forward-thinking composition';
    }
    
    if (keywords.includes('trust') || keywords.includes('reliable')) {
      return platform === 'facebook' ? 'trustworthy presence, reliable service representation, authentic interaction' :
             platform === 'linkedin' ? 'professional credibility, trust-building elements, reliable expertise' :
             'trust-inspiring elements, credible presentation, authentic representation';
    }
    
    // Default platform-appropriate engagement
    return platform === 'instagram' ? 'engaging aesthetic, lifestyle appeal, visual storytelling' :
           platform === 'facebook' ? 'community-focused, relatable engagement, social connection' :
           platform === 'linkedin' ? 'professional engagement, business-focused, industry relevance' :
           'brand-consistent engagement, authentic presentation, audience connection';
  }

  /**
   * Generate short-form video script prompts based on brand
   */
  static generateVideoScriptPrompt(brandContext: BrandContext, platform: string, duration: number = 60): string {
    const hook = this.generateHook(brandContext, platform);
    const coreMessage = this.generateCoreMessage(brandContext);
    const cta = this.generateCTA(brandContext, platform);
    
    return `Generate a ${duration}-second ${platform} script for ${brandContext.businessType || 'business'} promoting ${brandContext.products?.[0] || 'services'} to ${brandContext.targetAudience || 'customers'}. 

Hook (3-5 seconds): ${hook}
Core Message (${Math.floor(duration * 0.6)}-${Math.floor(duration * 0.8)} seconds): ${coreMessage}
CTA (5-10 seconds): ${cta}

Brand Purpose: ${brandContext.brandPurpose || 'Professional service delivery'}
Tone: ${brandContext.tone || 'Professional and engaging'}
Location Context: ${brandContext.location || 'Modern business environment'}`;
  }

  /**
   * Generate Queensland business-specific prompts
   */
  static generateQueenslandPrompt(brandContext: BrandContext, platform: string): string {
    const qldElements = [
      'Brisbane CBD professional environment',
      'Gold Coast modern business setting',
      'Sunshine Coast entrepreneurial workspace',
      'Queensland subtropical natural lighting',
      'Australian business innovation hub'
    ];
    
    const randomQldElement = qldElements[Math.floor(Math.random() * qldElements.length)];
    const industrySpecific = this.getQueenslandIndustryContext(brandContext.industry || 'business');
    
    const basePrompt = "Super Realism, High-resolution photograph, UHD, photorealistic, shot on a Sony A7III";
    const platformReqs = this.getPlatformRequirements(platform);
    
    return `${basePrompt}, ${brandContext.businessType || 'professional'} in ${randomQldElement}, ${industrySpecific}, ${brandContext.brandPurpose || 'business excellence'}, natural Australian lighting, ${platformReqs.style} --ar ${platformReqs.aspectRatio} --style raw --stylize 250`;
  }

  /**
   * Generate niche-specific challenge prompts (TikTok style)
   */
  static generateChallengePrompt(brandContext: BrandContext): string {
    const niche = brandContext.industry || 'business';
    const challenges = this.getIndustryChallenges(niche);
    
    return `Generate 5 innovative ${niche} challenge ideas that align with ${brandContext.brandPurpose || 'brand values'}. For each challenge, provide:
    
1. Catchy title related to ${brandContext.businessType || 'business'}
2. Brief description incorporating ${brandContext.targetAudience || 'target audience'}
3. Trending hashtags for ${brandContext.location || 'local market'}
4. Visual elements showing ${brandContext.products?.join(', ') || 'services'}
5. Call-to-action driving ${this.getPrimaryCTA(brandContext)}

Brand Context: ${brandContext.brandPurpose}
Target Audience: ${brandContext.targetAudience}
Industry Focus: ${niche}`;
  }

  /**
   * Get platform-specific requirements
   */
  private static getPlatformRequirements(platform: string): PlatformRequirements {
    const requirements = {
      facebook: {
        platform: 'Facebook',
        aspectRatio: '16:9',
        style: 'community-focused, warm lighting, social engagement elements',
        engagement: ['comments', 'shares', 'reactions']
      },
      instagram: {
        platform: 'Instagram',
        aspectRatio: '1:1',
        style: 'aesthetic minimalist, premium lighting, lifestyle elements',
        engagement: ['likes', 'saves', 'story shares']
      },
      linkedin: {
        platform: 'LinkedIn',
        aspectRatio: '16:9',
        style: 'corporate professional, formal lighting, business attire',
        engagement: ['professional comments', 'connections', 'career growth']
      },
      youtube: {
        platform: 'YouTube',
        aspectRatio: '16:9',
        duration: '60 seconds',
        style: 'dynamic composition, engaging lighting, educational elements',
        engagement: ['subscriptions', 'watch time', 'tutorial completion']
      },
      x: {
        platform: 'X',
        aspectRatio: '16:9',
        style: 'trending aesthetic, modern composition, conversation-starting elements',
        engagement: ['retweets', 'replies', 'viral potential']
      }
    };

    return requirements[platform as keyof typeof requirements] || requirements.facebook;
  }

  /**
   * Get industry-specific visual elements
   */
  private static getIndustryElements(industry: string): string {
    const elements = {
      technology: 'modern tech workspace, innovative equipment, digital interfaces',
      healthcare: 'clean medical environment, professional healthcare setting, patient-focused',
      finance: 'executive office space, financial analytics, trust-building elements',
      retail: 'customer-centric storefront, product displays, shopping experience',
      consulting: 'strategic meeting room, professional consultation, expertise demonstration',
      education: 'learning environment, knowledge sharing, student engagement',
      real_estate: 'property showcase, professional presentation, market expertise',
      hospitality: 'welcoming environment, service excellence, customer satisfaction',
      fitness: 'active lifestyle, health-focused, motivational atmosphere',
      legal: 'professional law office, trust and authority, client consultation'
    };

    return elements[industry as keyof typeof elements] || 'professional business environment, industry expertise, client-focused setting';
  }

  /**
   * Get audience-specific elements
   */
  private static getAudienceElements(audience: string): string {
    const elements = {
      professionals: 'executive presence, business sophistication, career advancement',
      entrepreneurs: 'innovative mindset, startup energy, growth-oriented',
      consumers: 'lifestyle enhancement, practical benefits, everyday solutions',
      students: 'educational value, accessibility, future-focused',
      families: 'family-friendly, trust and security, community values',
      seniors: 'respectful approach, accessibility, life experience recognition'
    };

    return elements[audience as keyof typeof elements] || 'broad appeal, inclusive representation, value-focused messaging';
  }

  /**
   * Generate engaging hooks based on brand and platform
   */
  private static generateHook(brandContext: BrandContext, platform: string): string {
    const hooks = {
      question: `What if ${brandContext.businessType || 'your business'} could ${this.getBrandBenefit(brandContext)}?`,
      statistic: `${this.getIndustryStatistic(brandContext.industry || 'business')} - here's how ${brandContext.businessType || 'we'} change that`,
      problem: `Tired of ${this.getCommonPainPoint(brandContext.industry || 'business')}? ${brandContext.brandPurpose || 'We have the solution'}`,
      benefit: `Transform your ${brandContext.industry || 'business'} with ${brandContext.products?.[0] || 'our approach'}`,
      story: `When ${brandContext.targetAudience || 'customers'} discovered ${brandContext.businessType || 'our solution'}, everything changed`
    };

    const hookTypes = Object.keys(hooks);
    const randomHook = hookTypes[Math.floor(Math.random() * hookTypes.length)];
    return hooks[randomHook as keyof typeof hooks];
  }

  /**
   * Generate core message based on brand purpose
   */
  private static generateCoreMessage(brandContext: BrandContext): string {
    return `Showcase how ${brandContext.brandPurpose || 'our solution'} delivers ${this.getBrandBenefit(brandContext)} for ${brandContext.targetAudience || 'customers'} in ${brandContext.location || 'your area'}. Demonstrate ${brandContext.products?.join(' and ') || 'key benefits'} through ${this.getContentStyle(brandContext.tone || 'professional')}.`;
  }

  /**
   * Generate platform-specific CTAs
   */
  private static generateCTA(brandContext: BrandContext, platform: string): string {
    const ctas = {
      facebook: `Comment below how ${brandContext.businessType || 'this'} could help your ${brandContext.industry || 'business'}`,
      instagram: `Save this post and follow for more ${brandContext.industry || 'business'} insights`,
      linkedin: `Connect with us to discuss ${brandContext.brandPurpose || 'opportunities'}`,
      youtube: `Subscribe for weekly ${brandContext.industry || 'business'} strategy videos`,
      x: `Share your thoughts on ${brandContext.industry || 'business'} transformation`
    };

    return ctas[platform as keyof typeof ctas] || `Learn more about ${brandContext.brandPurpose || 'our services'}`;
  }

  /**
   * Get Queensland-specific industry context
   */
  private static getQueenslandIndustryContext(industry: string): string {
    const qldContexts = {
      technology: 'Queensland innovation district, startup ecosystem, tech hub energy',
      tourism: 'Gold Coast hospitality excellence, Queensland tourism showcase',
      agriculture: 'Queensland primary industry, rural business innovation',
      mining: 'Queensland resources sector, industrial excellence',
      healthcare: 'Queensland health network, medical innovation',
      education: 'Queensland educational excellence, learning innovation',
      finance: 'Brisbane financial district, Queensland economic growth'
    };

    return qldContexts[industry as keyof typeof qldContexts] || 'Queensland business excellence, local market leadership';
  }

  /**
   * Helper methods for dynamic content generation
   */
  private static getBrandBenefit(brandContext: BrandContext): string {
    const benefits = [
      `${brandContext.products?.[0] || 'solutions'} that deliver results`,
      `streamline your ${brandContext.industry || 'business'} operations`,
      `achieve your ${brandContext.brandPurpose || 'business goals'}`,
      `transform your ${brandContext.targetAudience || 'customer'} experience`
    ];
    return benefits[Math.floor(Math.random() * benefits.length)];
  }

  private static getIndustryStatistic(industry: string): string {
    const stats = {
      technology: '87% of businesses struggle with digital transformation',
      healthcare: '73% of patients want better healthcare accessibility',
      finance: '65% of people need better financial planning',
      retail: '82% of customers expect personalized experiences',
      consulting: '91% of businesses need strategic guidance'
    };
    return stats[industry as keyof typeof stats] || '78% of businesses need better solutions';
  }

  private static getCommonPainPoint(industry: string): string {
    const painPoints = {
      technology: 'outdated systems slowing your progress',
      healthcare: 'complex healthcare processes',
      finance: 'confusing financial decisions',
      retail: 'inconsistent customer experiences',
      consulting: 'unclear business strategy'
    };
    return painPoints[industry as keyof typeof painPoints] || 'inefficient business processes';
  }

  private static getIndustryChallenges(industry: string): string[] {
    const challenges = {
      fitness: ['30-day transformation', 'morning routine', 'healthy meal prep', 'workout motivation', 'wellness journey'],
      business: ['productivity hack', 'leadership moment', 'innovation showcase', 'team building', 'success story'],
      technology: ['digital transformation', 'automation showcase', 'tech innovation', 'efficiency boost', 'future-ready'],
      education: ['learning breakthrough', 'knowledge sharing', 'skill development', 'educational impact', 'growth mindset']
    };
    return challenges[industry as keyof typeof challenges] || challenges.business;
  }

  private static getPrimaryCTA(brandContext: BrandContext): string {
    return brandContext.businessType === 'consulting' ? 'consultation bookings' :
           brandContext.businessType === 'retail' ? 'product sales' :
           brandContext.businessType === 'service' ? 'service inquiries' :
           'business engagement';
  }

  private static getContentStyle(tone: string): string {
    const styles = {
      professional: 'expert demonstration and case studies',
      friendly: 'conversational explanation and relatable examples',
      authoritative: 'data-driven insights and industry expertise',
      inspirational: 'motivational storytelling and success examples',
      educational: 'step-by-step tutorials and clear explanations'
    };
    return styles[tone as keyof typeof styles] || styles.professional;
  }

  private static getEngagementHook(contentType: string, tone: string): string {
    const hooks = {
      promotional: 'customer success focus, value demonstration',
      educational: 'learning engagement, knowledge transfer',
      inspirational: 'motivational elements, aspiration building',
      testimonial: 'authentic experience, trust building'
    };
    return hooks[contentType as keyof typeof hooks] || hooks.promotional;
  }
}