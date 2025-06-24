/**
 * LinkedIn OAuth Setup and Integration Test
 */

async function setupLinkedInOAuth() {
  console.log('💼 LINKEDIN OAUTH SETUP AND INTEGRATION');
  console.log('=======================================');
  
  const clientId = process.env.LINKEDIN_CLIENT_ID;
  const clientSecret = process.env.LINKEDIN_CLIENT_SECRET;
  const accessToken = process.env.LINKEDIN_ACCESS_TOKEN;
  
  if (!clientId || !clientSecret) {
    console.log('❌ LinkedIn credentials missing');
    return;
  }
  
  console.log('✅ LinkedIn credentials available');
  console.log(`Client ID: ${clientId}`);
  console.log(`Has Access Token: ${!!accessToken}`);
  
  // Generate LinkedIn OAuth URL
  const redirectUri = 'https://4fc77172-459a-4da7-8c33-5014abb1b73e-00-dqhtnud4ismj.worf.replit.dev/';
  const state = 'linkedin_production_' + Date.now();
  const scope = 'w_member_social,r_liteprofile,r_emailaddress';
  
  const authUrl = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}&scope=${scope}`;
  
  console.log('');
  console.log('🔗 LinkedIn OAuth Authorization URL:');
  console.log(authUrl);
  
  // Test existing access token if available
  if (accessToken) {
    console.log('');
    console.log('🧪 Testing existing LinkedIn access token...');
    
    try {
      // Test LinkedIn API access
      const profileResponse = await fetch('https://api.linkedin.com/v2/people/~', {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });
      
      if (profileResponse.ok) {
        const profileData = await profileResponse.json();
        console.log('✅ LinkedIn token valid');
        console.log(`Profile ID: ${profileData.id}`);
        
        // Create LinkedIn connection in database
        const { Pool } = await import('@neondatabase/serverless');
        const pool = new Pool({ connectionString: process.env.DATABASE_URL });
        
        try {
          const insertResult = await pool.query(`
            INSERT INTO platform_connections 
            (user_id, platform, platform_username, platform_user_id, access_token, refresh_token, expires_at, is_active)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            ON CONFLICT (user_id, platform) 
            DO UPDATE SET 
              access_token = $5,
              platform_user_id = $4,
              is_active = $8
            RETURNING id, platform_username
          `, [
            2, // user_id
            'linkedin',
            'LinkedIn Professional',
            profileData.id,
            accessToken,
            null,
            null,
            true
          ]);
          
          console.log('✅ LinkedIn connection created/updated');
          console.log(`Connection ID: ${insertResult.rows[0].id}`);
          
          // Test LinkedIn posting
          console.log('');
          console.log('📝 Testing LinkedIn posting capability...');
          
          const testPost = {
            author: `urn:li:person:${profileData.id}`,
            lifecycleState: 'PUBLISHED',
            specificContent: {
              'com.linkedin.ugc.ShareContent': {
                shareCommentary: {
                  text: `🚀 TheAgencyIQ LinkedIn Integration Successful!

Professional networking automation now active for Queensland small businesses.

✅ X Platform operational
✅ Facebook connected  
✅ Instagram ready
✅ LinkedIn professional network activated

#TheAgencyIQ #LinkedInReady #ProfessionalNetworking #Queensland #SmallBusiness`
                },
                shareMediaCategory: 'NONE'
              }
            },
            visibility: {
              'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC'
            }
          };
          
          const postResponse = await fetch('https://api.linkedin.com/v2/ugcPosts', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
              'X-Restli-Protocol-Version': '2.0.0'
            },
            body: JSON.stringify(testPost)
          });
          
          const postResult = await postResponse.json();
          
          if (postResponse.ok) {
            console.log('✅ LinkedIn test post successful');
            console.log(`Post ID: ${postResult.id}`);
          } else {
            console.log('⚠️  LinkedIn posting needs user authorization');
            console.log('Error:', postResult);
          }
          
        } catch (dbError) {
          console.log('Database error:', dbError.message);
        } finally {
          await pool.end();
        }
        
      } else {
        const errorData = await profileResponse.json();
        console.log('❌ LinkedIn token invalid or expired');
        console.log('Error:', errorData);
        console.log('');
        console.log('Use the OAuth URL above to get a fresh token');
      }
      
    } catch (error) {
      console.log('❌ LinkedIn API test failed:', error.message);
    }
  } else {
    console.log('');
    console.log('ℹ️  No existing access token found');
    console.log('Use the OAuth URL above to authorize LinkedIn access');
  }
  
  console.log('');
  console.log('📋 Next Steps:');
  console.log('1. Visit the OAuth URL above');
  console.log('2. Authorize TheAgencyIQ to access LinkedIn');
  console.log('3. You will be redirected back automatically');
  console.log('4. LinkedIn integration will be completed');
}

setupLinkedInOAuth();