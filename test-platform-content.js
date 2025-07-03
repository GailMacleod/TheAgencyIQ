/**
 * Test script for enhanced platform-specific content generation
 */

const { generateContentCalendar } = require('./server/grok.ts');

async function testPlatformSpecificContent() {
  console.log('🎯 TESTING ENHANCED GROK AI CONTENT GENERATION');
  console.log('===============================================');
  
  const testParams = {
    brandName: 'TheAgencyIQ',
    productsServices: 'AI-powered social media automation and intelligent content scheduling',
    corePurpose: 'Intelligent automation solutions for Queensland SMEs',
    audience: 'Queensland small business owners and entrepreneurs',
    jobToBeDone: 'Streamline social media management and increase engagement',
    motivations: 'Save time, increase productivity, grow business reach',
    painPoints: 'Manual posting, inconsistent content, time management challenges',
    goals: { growth: true, engagement: true, automation: true },
    contactDetails: { email: 'support@theagencyiq.ai', phone: '+61 7 3000 0000' },
    platforms: ['facebook', 'instagram', 'linkedin', 'youtube', 'x'],
    totalPosts: 5
  };

  try {
    console.log('Generating platform-specific content...\n');
    const posts = await generateContentCalendar(testParams);
    
    console.log('=== PLATFORM-SPECIFIC CONTENT ANALYSIS ===\n');
    
    const specifications = {
      facebook: { min: 80, max: 120, tone: 'engaging and community-focused' },
      instagram: { min: 50, max: 70, tone: 'casual and visually-driven' },
      linkedin: { min: 100, max: 150, tone: 'authoritative and professional' },
      youtube: { min: 70, max: 100, tone: 'enthusiastic and compelling' },
      x: { min: 50, max: 70, tone: 'concise and trending' }
    };
    
    posts.forEach((post, i) => {
      const wordCount = post.content.split(/\s+/).length;
      const spec = specifications[post.platform];
      const withinRange = spec && wordCount >= spec.min && wordCount <= spec.max;
      
      console.log(`${i+1}. PLATFORM: ${post.platform.toUpperCase()}`);
      console.log(`   Target: ${spec?.min}-${spec?.max} words (${spec?.tone})`);
      console.log(`   Actual: ${wordCount} words ${withinRange ? '✅' : '❌'}`);
      console.log(`   Content Preview: "${post.content.substring(0, 100)}..."`);
      console.log(`   Hashtag Policy: ${post.platform === 'x' ? 'NO hashtags (X policy)' : 'Hashtags included'}`);
      console.log(`   Queensland Focus: ${post.content.includes('Queensland') ? '✅' : '❌'}`);
      console.log(`   Scheduled: ${new Date(post.scheduledFor).toLocaleString()}`);
      console.log('   ---');
    });
    
    // Summary statistics
    const totalWithinRange = posts.filter(post => {
      const wordCount = post.content.split(/\s+/).length;
      const spec = specifications[post.platform];
      return spec && wordCount >= spec.min && wordCount <= spec.max;
    }).length;
    
    console.log(`\n📊 GENERATION QUALITY SUMMARY:`);
    console.log(`   Posts within word count specifications: ${totalWithinRange}/${posts.length}`);
    console.log(`   Queensland market focus: ${posts.filter(p => p.content.includes('Queensland')).length}/${posts.length}`);
    console.log(`   X platform hashtag compliance: ${posts.filter(p => p.platform === 'x' && !p.content.includes('#')).length > 0 ? '✅' : '❌'}`);
    
    return posts;
    
  } catch (error) {
    console.error('❌ Content generation failed:', error.message);
    console.log('\n🔄 Testing fallback content generation...');
    
    // Test fallback content
    const { generateFallbackContent } = require('./server/grok.ts');
    const platforms = ['facebook', 'instagram', 'linkedin', 'youtube', 'x'];
    
    platforms.forEach(platform => {
      const fallbackContent = generateFallbackContent(testParams, platform, 1);
      const wordCount = fallbackContent.split(/\s+/).length;
      console.log(`${platform.toUpperCase()}: ${wordCount} words - "${fallbackContent.substring(0, 80)}..."`);
    });
  }
}

// Run the test
testPlatformSpecificContent().catch(console.error);