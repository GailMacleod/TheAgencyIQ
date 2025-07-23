interface JTBDContext {
  businessName?: string;
  industry?: string;
  targetAudience?: string;
  brandPurpose?: string;
  location?: string;
  businessType?: string;
}

interface JTBDPrompt {
  situation: string;
  motivation: string;
  outcome: string;
  videoPrompt: string;
  cinematicElements: string[];
}

export class JTBDPromptGenerator {
  private queenslandElements = [
    'sun-drenched Queensland business district',
    'iconic Brisbane skyline in background',
    'Gold Coast modern office environment',
    'Cairns tropical business setting',
    'Toowoomba rural business community',
    'Sunshine Coast lifestyle business atmosphere'
  ];

  private cinematicStyles = {
    cinematic: [
      'Golden hour cinematography with warm Australian sunlight',
      'Professional depth of field with smooth bokeh transitions',
      'Orchestral music building emotional connection',
      'Smooth camera movements from wide establishing shots to intimate close-ups'
    ],
    documentary: [
      'Authentic handheld camera work capturing real moments',
      'Natural lighting showcasing genuine Queensland business environments',
      'Ambient sound design with subtle music undertones',
      'Honest, unscripted interactions between real business owners'
    ],
    commercial: [
      'High-energy quick cuts with dynamic camera angles',
      'Bright, optimistic lighting reflecting Queensland sunshine',
      'Upbeat, motivational soundtrack driving action',
      'Professional product shots with lifestyle integration'
    ]
  };

  generateJTBDPrompt(context: JTBDContext, style: keyof typeof this.cinematicStyles = 'cinematic'): JTBDPrompt {
    const location = this.getQueenslandLocation(context.location);
    const industry = context.industry || 'small business';
    const audience = context.targetAudience || 'Queensland small business owners';
    
    // JTBD Framework: When [situation], I want [motivation], so I can [outcome]
    const situation = this.generateSituation(context, location);
    const motivation = this.generateMotivation(context);
    const outcome = this.generateOutcome(context);
    
    const videoPrompt = this.createVideoPrompt(situation, motivation, outcome, context, location, style);
    const cinematicElements = this.cinematicStyles[style];

    return {
      situation,
      motivation,
      outcome,
      videoPrompt,
      cinematicElements
    };
  }

  private generateSituation(context: JTBDContext, location: string): string {
    const situations = [
      `When a ${context.industry || 'small business'} owner in ${location} is struggling to stand out in a competitive market`,
      `When Queensland entrepreneurs need to connect authentically with their local community`,
      `When ${context.businessType || 'business owners'} want to showcase their expertise and build trust with potential customers`,
      `When local businesses need to demonstrate their value proposition clearly and compellingly`,
      `When ${location} business owners want to leverage social media to grow their customer base`
    ];

    return situations[Math.floor(Math.random() * situations.length)];
  }

  private generateMotivation(context: JTBDContext): string {
    const motivations = [
      `create compelling video content that resonates with their target audience`,
      `tell their brand story in a way that builds emotional connection and trust`,
      `showcase their products/services through professional, engaging visual content`,
      `establish themselves as the go-to expert in their field within their local community`,
      `generate more leads and conversions through authentic, story-driven marketing`
    ];

    return motivations[Math.floor(Math.random() * motivations.length)];
  }

  private generateOutcome(context: JTBDContext): string {
    const outcomes = [
      `attract more qualified customers who understand and value what they offer`,
      `build a stronger, more recognizable brand presence in their local Queensland market`,
      `increase customer engagement and loyalty through authentic storytelling`,
      `drive more foot traffic and online inquiries to grow their business sustainably`,
      `establish long-term relationships with customers who become brand advocates`
    ];

    return outcomes[Math.floor(Math.random() * outcomes.length)];
  }

  private createVideoPrompt(
    situation: string, 
    motivation: string, 
    outcome: string, 
    context: JTBDContext, 
    location: string,
    style: keyof typeof this.cinematicStyles
  ): string {
    const brandIntegration = context.brandPurpose ? 
      `The video should embody the brand purpose: "${context.brandPurpose}"` : '';
    
    const businessIntegration = context.businessName ? 
      `featuring ${context.businessName}` : '';

    return `
Create a ${style} video ${businessIntegration} that addresses this Jobs-to-be-Done framework:

SITUATION: ${situation}
MOTIVATION: ${motivation}  
OUTCOME: ${outcome}

SETTING: ${location} with authentic Queensland business atmosphere

VISUAL STORY:
- Open with establishing shot of ${location} business environment
- Show real business owner or team member in their authentic work setting
- Demonstrate the challenge/situation through visual storytelling
- Transition to show the solution/service in action
- Conclude with satisfied customers or successful business outcomes

EMOTIONAL JOURNEY:
- Begin with relatable challenge that Queensland business owners face
- Build empathy and understanding through authentic moments
- Transition to hope and possibility with solution introduction
- Culminate in transformation and success

BRAND INTEGRATION:
${brandIntegration}
- Subtly showcase expertise without being overly promotional
- Focus on customer transformation rather than product features
- Maintain authentic Queensland business community feel

TECHNICAL REQUIREMENTS:
- 30-45 second duration optimized for social media
- Natural lighting that reflects Queensland's sunny, optimistic environment  
- Professional audio quality with ambient business sounds
- Mobile-first composition with clear focal points
- Captions-ready formatting for accessibility
    `.trim();
  }

  private getQueenslandLocation(location?: string): string {
    if (!location) {
      return this.queenslandElements[Math.floor(Math.random() * this.queenslandElements.length)];
    }

    const locationLower = location.toLowerCase();
    
    if (locationLower.includes('brisbane')) return 'iconic Brisbane business district';
    if (locationLower.includes('gold coast')) return 'Gold Coast modern office environment';
    if (locationLower.includes('cairns')) return 'Cairns tropical business setting';
    if (locationLower.includes('toowoomba')) return 'Toowoomba rural business community';
    if (locationLower.includes('sunshine coast')) return 'Sunshine Coast lifestyle business atmosphere';
    if (locationLower.includes('townsville')) return 'Townsville regional business hub';
    if (locationLower.includes('rockhampton')) return 'Rockhampton central Queensland business center';
    
    return `${location} Queensland business community`;
  }

  generateMultiplePrompts(context: JTBDContext, count: number = 3): JTBDPrompt[] {
    const styles: (keyof typeof this.cinematicStyles)[] = ['cinematic', 'documentary', 'commercial'];
    const prompts: JTBDPrompt[] = [];

    for (let i = 0; i < count; i++) {
      const style = styles[i % styles.length];
      prompts.push(this.generateJTBDPrompt(context, style));
    }

    return prompts;
  }

  // Generate prompts specifically for different video types
  generateCustomerTestimonialPrompt(context: JTBDContext): JTBDPrompt {
    const customContext = {
      ...context,
      targetAudience: 'potential customers seeking social proof'
    };

    const prompt = this.generateJTBDPrompt(customContext, 'documentary');
    
    prompt.videoPrompt = `
Create an authentic customer testimonial video featuring a real ${context.businessName || 'Queensland business'} customer:

TESTIMONIAL STRUCTURE:
- Customer introduces themselves and their connection to the business
- Describes their original situation/challenge that led them to seek this solution
- Explains why they chose this particular business over competitors
- Details the specific results and transformation they experienced
- Recommends the business to others in the Queensland community

SETTING: Natural environment where customer actually uses the product/service

EMOTIONAL TONE: Genuine gratitude and authentic enthusiasm

TECHNICAL APPROACH: Documentary style with natural lighting and ambient sound
    `.trim();

    return prompt;
  }

  generateBehindTheScenesPrompt(context: JTBDContext): JTBDPrompt {
    const prompt = this.generateJTBDPrompt(context, 'documentary');
    
    prompt.videoPrompt = `
Create a behind-the-scenes video showing ${context.businessName || 'the Queensland business'} in action:

STORY ELEMENTS:
- Early morning preparation or setup routines
- Team collaboration and problem-solving moments  
- Attention to detail and quality control processes
- Customer interaction and service delivery
- End-of-day satisfaction and team camaraderie

FOCUS: Authentic work culture and dedication to customer satisfaction

SETTING: Real workplace environment showcasing the human side of business

EMOTIONAL TONE: Pride in craftsmanship and genuine care for customers
    `.trim();

    return prompt;
  }
}

export const jtbdPromptGenerator = new JTBDPromptGenerator();