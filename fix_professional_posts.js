// Create exactly 52 posts for Professional plan
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function createProfessionalPosts() {
  const platforms = ['facebook', 'instagram', 'linkedin', 'youtube', 'tiktok'];
  const startDate = new Date('2025-06-10T09:00:00.000Z');
  
  const posts = [];
  for (let i = 0; i < 52; i++) {
    const platform = platforms[i % platforms.length];
    const dayOffset = Math.floor(i / 2); // ~2 posts per day
    const postDate = new Date(startDate);
    postDate.setDate(postDate.getDate() + dayOffset);
    postDate.setHours(9 + (i % 12)); // Vary posting times
    
    const contentTemplates = {
      facebook: [
        `Transform your Queensland business with AI-powered social media automation. Save hours weekly while boosting engagement. Post ${i + 1}/52. #TheAgencyIQ #QldBusiness`,
        `Queensland small businesses are embracing AI automation to scale their presence efficiently. Post ${i + 1}/52. #TheAgencyIQ #BusinessGrowth`,
        `Innovation update: TheAgencyIQ launches advanced AI features for Queensland market. Post ${i + 1}/52. #TheAgencyIQ #Innovation`
      ],
      instagram: [
        `Behind the scenes: How AI creates perfect posting schedules for busy QLD entrepreneurs. Post ${i + 1}/52. #TheAgencyIQ #SocialMediaAI`,
        `Monday motivation: Your content calendar sorted while you sleep. Post ${i + 1}/52. #TheAgencyIQ #Automation`,
        `Weekend vibes: Your social media works while you enjoy Queensland sunshine. Post ${i + 1}/52. #TheAgencyIQ #WorkLifeBalance`
      ],
      linkedin: [
        `Queensland small businesses are embracing AI automation to scale their social media presence efficiently. Post ${i + 1}/52. #TheAgencyIQ #BusinessGrowth`,
        `ROI spotlight: Queensland businesses see 400% improvement in social media efficiency. Post ${i + 1}/52. #TheAgencyIQ #ROI`,
        `Strategic planning: Integrating AI automation into Queensland business operations. Post ${i + 1}/52. #TheAgencyIQ #Strategy`
      ],
      youtube: [
        `Complete guide to AI social media automation for Queensland businesses. Post ${i + 1}/52. #TheAgencyIQ #Tutorial`,
        `Best practices for AI-driven content strategy in Queensland markets. Post ${i + 1}/52. #TheAgencyIQ #BestPractices`,
        `Live demo: Creating 30 days of content in 30 minutes with AI. Post ${i + 1}/52. #TheAgencyIQ #Demo`
      ],
      tiktok: [
        `POV: Your social media runs itself while you focus on growing your QLD business. Post ${i + 1}/52. #TheAgencyIQ #SmallBusiness`,
        `When your AI posts better content than your competitors manual posts. Post ${i + 1}/52. #TheAgencyIQ #AI`,
        `Queensland business glow-up: Before and after AI social media automation. Post ${i + 1}/52. #TheAgencyIQ #Transformation`
      ]
    };
    
    const templates = contentTemplates[platform];
    const content = templates[i % templates.length];
    
    posts.push({
      platform,
      content,
      scheduledFor: postDate.toISOString()
    });
  }
  
  // Insert all posts
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    for (const post of posts) {
      await client.query(
        'INSERT INTO posts (user_id, platform, content, status, scheduled_for, subscription_cycle, ai_recommendation, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())',
        [2, post.platform, post.content, 'draft', post.scheduledFor, 'professional_2025_06_10', 'AI-optimized for Queensland SMEs']
      );
    }
    
    await client.query('COMMIT');
    console.log('Successfully created 52 posts for Professional plan');
    
    // Verify count
    const result = await client.query('SELECT COUNT(*) FROM posts WHERE user_id = 2');
    console.log('Total posts in database:', result.rows[0].count);
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating posts:', error);
  } finally {
    client.release();
  }
}

createProfessionalPosts();