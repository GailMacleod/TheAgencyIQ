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
  const [user, setUser] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const initializeApp = async () => {
      try {
        const sessionData = await establishSession();
        if (sessionData?.success) {
          const userData = await getUser();
          setUser(userData);
          console.log('App initialized with user:', userData);
        }
      } catch (error) {
        console.error('Error initializing app:', error);
      } finally {
        setLoading(false);
      }
    };
    
    initializeApp();
  }, []);

  if (loading) {
    return <div style={{ padding: '20px', textAlign: 'center' }}>Loading TheAgencyIQ...</div>;
  }

  return (
    <div>
      {user && (
        <div style={{ 
          padding: '10px', 
          background: '#f0f8ff', 
          marginBottom: '20px',
          border: '1px solid #ddd',
          borderRadius: '4px'
        }}>
          <strong>User:</strong> {user.email} | <strong>Plan:</strong> {user.subscriptionPlan} | <strong>Posts:</strong> {user.remainingPosts}/{user.totalPosts} remaining
        </div>
      )}
      <VideoApproval />
    </div>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(<App />);