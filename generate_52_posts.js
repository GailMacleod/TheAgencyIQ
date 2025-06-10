const platforms = ['facebook', 'instagram', 'linkedin', 'youtube', 'tiktok'];
const startDate = new Date('2025-06-10T09:00:00.000Z');

const posts = [];
for (let i = 0; i < 52; i++) {
  const platform = platforms[i % platforms.length];
  const dayOffset = Math.floor(i / 2); // Roughly 2 posts per day over 30 days
  const postDate = new Date(startDate);
  postDate.setDate(postDate.getDate() + dayOffset);
  postDate.setHours(9 + (i % 12)); // Vary posting times
  
  const content = `AI-optimized content for The AgencyIQ on ${platform}. Post ${i + 1}/52 for Professional plan. Helping Queensland small businesses automate their social media strategy. #TheAgencyIQ #QldBusiness #AI #SocialMedia`;
  
  posts.push({
    platform,
    content,
    scheduledFor: postDate.toISOString()
  });
}

console.log(JSON.stringify(posts, null, 2));