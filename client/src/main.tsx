import React from 'react';
import { createRoot } from 'react-dom/client';
import VideoApproval from './VideoApproval';
import './index.css';

// Establish session on app startup
const establishSession = async () => {
  try {
    const response = await fetch('/api/establish-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'gailm@macleodglba.com.au' })
    });
    const data = await response.json();
    console.log('Session established:', data);
    return data;
  } catch (error) {
    console.error('Session establishment failed:', error);
    return null;
  }
};

// Get user info
const getUser = async () => {
  try {
    const response = await fetch('/api/user');
    const data = await response.json();
    console.log('User info:', data);
    return data;
  } catch (error) {
    console.error('User fetch failed:', error);
    return null;
  }
};

const App: React.FC = () => {
  React.useEffect(() => {
    // Initialize session and user data
    establishSession().then(sessionData => {
      if (sessionData?.success) {
        getUser().then(userData => {
          console.log('App initialized with user:', userData?.email);
        });
      }
    });
  }, []);

  return (
    <div>
      <VideoApproval />
    </div>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(<App />);