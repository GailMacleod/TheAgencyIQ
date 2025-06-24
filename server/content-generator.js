const generateContent = async () => {
  // Simplified content generation - no external dependencies
  const templates = [
    'Transform your Queensland business with smart automation! Save time, increase engagement across all social platforms. #BusinessAutomation #Queensland',
    'Ready to dominate social media? Our AI-powered automation ensures consistent posting while you focus on growth. #SocialMediaAutomation #DigitalTransformation',
    'Stop struggling with daily social media tasks! Automated scheduling means more time for customers. #Productivity #BusinessGrowth',
    'Queensland businesses discover the power of automated social media management. Join the revolution! #Queensland #BusinessInnovation',
    'Your competitors use automation to stay ahead. Level the playing field with smart scheduling. #CompetitiveAdvantage #BusinessStrategy'
  ];
  
  const content = templates[Math.floor(Math.random() * templates.length)];
  console.log('[GENERATOR] Generated content:', content.substring(0, 80) + '...');
  return content;
};

module.exports = { generateContent };