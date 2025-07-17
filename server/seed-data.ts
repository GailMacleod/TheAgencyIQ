import { RealStorage } from './storage-real';
import { testDatabaseConnection } from './real-db';

/**
 * Seed database with initial data for development and testing
 */
export async function seedDatabase() {
  console.log('🌱 Seeding database with initial data...');
  
  try {
    // Test database connection first
    const isConnected = await testDatabaseConnection();
    if (!isConnected) {
      console.error('❌ Database connection failed, cannot seed data');
      return false;
    }
    
    const storage = new RealStorage();
    
    // Check if main user already exists
    const existingUser = await storage.getUserByEmail('gailm@macleodglba.com.au');
    
    if (existingUser) {
      console.log('✅ Main user already exists in database');
      return true;
    }
    
    // Create main user
    const mainUser = await storage.createUser({
      email: 'gailm@macleodglba.com.au',
      phone: '+61424835189',
      password: 'Tw33dl3dum!', // In production, this should be hashed
      subscriptionPlan: 'professional',
      quotaLimit: 52,
      quotaUsed: 0,
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    console.log('✅ Main user created:', mainUser.email);
    
    // Create brand purpose for the user
    await storage.createBrandPurpose({
      userId: mainUser.id,
      brandName: 'TheAgencyIQ',
      corePurpose: 'Help Queensland small businesses grow their social media presence with AI-powered automation',
      targetAudience: 'Queensland small and medium business owners',
      productsServices: 'Social media automation, content generation, multi-platform publishing',
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    console.log('✅ Brand purpose created for main user');
    
    // Create some sample platform connections
    const platforms = ['facebook', 'instagram', 'linkedin', 'twitter', 'youtube'];
    
    for (const platform of platforms) {
      await storage.createPlatformConnection({
        userId: mainUser.id,
        platform,
        username: `AgencyIQ_${platform}`,
        accessToken: `${platform}_token_dev`,
        refreshToken: `${platform}_refresh_dev`,
        isActive: true,
        connectedAt: new Date(),
        expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }
    
    console.log('✅ Platform connections created for all 5 platforms');
    
    // Create some sample posts
    const samplePosts = [
      {
        content: 'Welcome to TheAgencyIQ! Your AI-powered social media automation platform for Queensland businesses. #SocialMediaAutomation #Queensland',
        platforms: ['facebook', 'instagram', 'linkedin'],
        status: 'published'
      },
      {
        content: 'Boost your business presence with intelligent content scheduling and multi-platform publishing. #BusinessGrowth #AI',
        platforms: ['facebook', 'twitter', 'linkedin'],
        status: 'draft'
      },
      {
        content: 'Join thousands of Queensland businesses using AI to streamline their social media strategy. #AIMarketing #Queensland',
        platforms: ['instagram', 'twitter', 'youtube'],
        status: 'scheduled'
      }
    ];
    
    for (const postData of samplePosts) {
      await storage.createPost({
        userId: mainUser.id,
        content: postData.content,
        platforms: postData.platforms,
        status: postData.status,
        scheduledFor: postData.status === 'scheduled' ? new Date(Date.now() + 24 * 60 * 60 * 1000) : null,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }
    
    console.log('✅ Sample posts created');
    
    console.log('🎉 Database seeding completed successfully!');
    return true;
    
  } catch (error) {
    console.error('❌ Database seeding failed:', error);
    return false;
  }
}

/**
 * Initialize database with seeded data if needed
 */
export async function initializeDatabase() {
  try {
    const success = await seedDatabase();
    if (success) {
      console.log('✅ Database initialization completed');
    } else {
      console.log('⚠️ Database initialization failed or skipped');
    }
  } catch (error) {
    console.error('❌ Database initialization error:', error);
  }
}