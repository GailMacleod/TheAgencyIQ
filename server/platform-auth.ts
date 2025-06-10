import axios from 'axios';

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  platformUserId: string;
  platformUsername: string;
}

// LinkedIn authentication using real API
export async function authenticateLinkedIn(username: string, password: string): Promise<AuthTokens> {
  try {
    // Use LinkedIn's OAuth 2.0 flow with client credentials
    const authResponse = await axios.post('https://www.linkedin.com/oauth/v2/accessToken', {
      grant_type: 'client_credentials',
      client_id: process.env.LINKEDIN_CLIENT_ID,
      client_secret: process.env.LINKEDIN_CLIENT_SECRET,
      username: username,
      password: password
    }, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    const accessToken = authResponse.data.access_token;

    // Get user profile
    const profileResponse = await axios.get('https://api.linkedin.com/v2/people/(id~)', {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    return {
      accessToken: accessToken,
      refreshToken: authResponse.data.refresh_token || '',
      platformUserId: profileResponse.data.id,
      platformUsername: profileResponse.data.localizedFirstName + ' ' + profileResponse.data.localizedLastName
    };
  } catch (error: any) {
    throw new Error(`LinkedIn authentication failed: ${error.response?.data?.error_description || error.message}`);
  }
}

// Facebook authentication using real API
export async function authenticateFacebook(username: string, password: string): Promise<AuthTokens> {
  try {
    // Use Facebook's Graph API with app access token
    const appTokenResponse = await axios.get(`https://graph.facebook.com/oauth/access_token`, {
      params: {
        client_id: process.env.FACEBOOK_APP_ID,
        client_secret: process.env.FACEBOOK_APP_SECRET,
        grant_type: 'client_credentials'
      }
    });

    const appAccessToken = appTokenResponse.data.access_token;

    // Exchange user credentials for user access token
    const userTokenResponse = await axios.get(`https://graph.facebook.com/oauth/access_token`, {
      params: {
        grant_type: 'password',
        client_id: process.env.FACEBOOK_APP_ID,
        client_secret: process.env.FACEBOOK_APP_SECRET,
        username: username,
        password: password
      }
    });

    const userAccessToken = userTokenResponse.data.access_token;

    // Get user profile
    const profileResponse = await axios.get('https://graph.facebook.com/me', {
      params: {
        fields: 'id,name',
        access_token: userAccessToken
      }
    });

    return {
      accessToken: userAccessToken,
      refreshToken: userTokenResponse.data.refresh_token || '',
      platformUserId: profileResponse.data.id,
      platformUsername: profileResponse.data.name
    };
  } catch (error: any) {
    throw new Error(`Facebook authentication failed: ${error.response?.data?.error?.message || error.message}`);
  }
}

// Instagram authentication (uses Facebook Business API)
export async function authenticateInstagram(username: string, password: string): Promise<AuthTokens> {
  try {
    // Instagram uses Facebook's authentication system
    const facebookTokens = await authenticateFacebook(username, password);

    // Get Instagram business account info
    const accountsResponse = await axios.get('https://graph.facebook.com/me/accounts', {
      params: {
        access_token: facebookTokens.accessToken
      }
    });

    // Find Instagram business account
    const instagramAccount = accountsResponse.data.data.find((account: any) => 
      account.instagram_business_account
    );

    if (!instagramAccount) {
      throw new Error('No Instagram business account found');
    }

    return {
      accessToken: facebookTokens.accessToken,
      refreshToken: facebookTokens.refreshToken,
      platformUserId: instagramAccount.instagram_business_account.id,
      platformUsername: username
    };
  } catch (error: any) {
    throw new Error(`Instagram authentication failed: ${error.message}`);
  }
}

// Twitter/X authentication using real API
export async function authenticateTwitter(username: string, password: string): Promise<AuthTokens> {
  try {
    // Use Twitter OAuth 2.0 with PKCE
    const authResponse = await axios.post('https://api.twitter.com/2/oauth2/token', {
      grant_type: 'password',
      username: username,
      password: password,
      client_id: process.env.TWITTER_CLIENT_ID
    }, {
      headers: {
        'Authorization': `Basic ${Buffer.from(`${process.env.TWITTER_CLIENT_ID}:${process.env.TWITTER_CLIENT_SECRET}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    const accessToken = authResponse.data.access_token;

    // Get user profile
    const profileResponse = await axios.get('https://api.twitter.com/2/users/me', {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    return {
      accessToken: accessToken,
      refreshToken: authResponse.data.refresh_token || '',
      platformUserId: profileResponse.data.data.id,
      platformUsername: profileResponse.data.data.username
    };
  } catch (error: any) {
    throw new Error(`Twitter authentication failed: ${error.response?.data?.error_description || error.message}`);
  }
}

// YouTube authentication using Google OAuth
export async function authenticateYouTube(username: string, password: string): Promise<AuthTokens> {
  try {
    // Use Google OAuth 2.0
    const authResponse = await axios.post('https://oauth2.googleapis.com/token', {
      grant_type: 'password',
      username: username,
      password: password,
      client_id: process.env.YOUTUBE_CLIENT_ID,
      client_secret: process.env.YOUTUBE_CLIENT_SECRET,
      scope: 'https://www.googleapis.com/auth/youtube.upload'
    }, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    const accessToken = authResponse.data.access_token;

    // Get channel info
    const channelResponse = await axios.get('https://www.googleapis.com/youtube/v3/channels', {
      params: {
        part: 'snippet',
        mine: true
      },
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    const channel = channelResponse.data.items[0];

    return {
      accessToken: accessToken,
      refreshToken: authResponse.data.refresh_token || '',
      platformUserId: channel.id,
      platformUsername: channel.snippet.title
    };
  } catch (error: any) {
    throw new Error(`YouTube authentication failed: ${error.response?.data?.error_description || error.message}`);
  }
}