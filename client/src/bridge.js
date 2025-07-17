// Bridge to connect existing UI components with working module system
// This allows us to use the existing sophisticated UI structure

const { useState, useEffect } = React;
const { createRoot } = ReactDOM;

// Simple API client for authentication
async function apiCall(endpoint, options = {}) {
  const response = await fetch(endpoint, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    ...options
  });
  
  if (!response.ok) {
    throw new Error(`API call failed: ${response.status}`);
  }
  
  return response.json();
}

// Session management
async function establishSession() {
  try {
    const response = await fetch('/api/establish-session', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' }
    });
    return response.ok;
  } catch (error) {
    console.error('Session establishment failed:', error);
    return false;
  }
}

// Simple Dashboard component mimicking the existing UI structure
function Dashboard({ user }) {
  const [platforms, setPlatforms] = useState([]);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    async function loadData() {
      try {
        const [platformData, postsData] = await Promise.all([
          apiCall('/api/platform-connections').catch(() => ({ platforms: [] })),
          apiCall('/api/posts').catch(() => ({ posts: [] }))
        ]);
        
        setPlatforms(platformData.platforms || []);
        setPosts(postsData.posts || []);
      } catch (error) {
        console.error('Failed to load data:', error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);
  
  if (loading) {
    return React.createElement('div', { 
      style: { 
        padding: '20px', 
        textAlign: 'center',
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #3250fa, #00f0ff)',
        color: 'white'
      } 
    }, 'Loading dashboard...');
  }
  
  return React.createElement('div', { 
    style: { 
      minHeight: '100vh',
      backgroundColor: '#f5f5f5',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    } 
  }, [
    // Header
    React.createElement('header', {
      key: 'header',
      style: {
        background: 'linear-gradient(135deg, #3250fa, #00f0ff)',
        color: 'white',
        padding: '20px',
        textAlign: 'center',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
      }
    }, [
      React.createElement('h1', { key: 'title', style: { margin: 0, fontSize: '2.5rem' } }, 'TheAgencyIQ'),
      React.createElement('p', { key: 'subtitle', style: { margin: '10px 0 0', opacity: 0.9 } }, 'Social Media Automation Platform')
    ]),
    
    // Main content
    React.createElement('main', { key: 'main', style: { padding: '40px 20px' } }, [
      React.createElement('div', { 
        key: 'container', 
        style: { maxWidth: '1200px', margin: '0 auto' } 
      }, [
        React.createElement('div', {
          key: 'welcome',
          style: {
            backgroundColor: 'white',
            padding: '30px',
            borderRadius: '12px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
            marginBottom: '30px',
            textAlign: 'center'
          }
        }, [
          React.createElement('h2', { 
            key: 'greeting', 
            style: { 
              fontSize: '2rem', 
              color: '#333',
              marginBottom: '10px'
            } 
          }, `Welcome back, ${user.email || 'User'}`),
          React.createElement('p', { 
            key: 'status', 
            style: { 
              color: '#666', 
              fontSize: '1.1rem' 
            } 
          }, `You have ${posts.length} posts scheduled`)
        ]),
        
        // Platform connections
        React.createElement('div', {
          key: 'platforms-section',
          style: {
            backgroundColor: 'white',
            padding: '30px',
            borderRadius: '12px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
            marginBottom: '30px'
          }
        }, [
          React.createElement('h3', { 
            key: 'platforms-title', 
            style: { 
              fontSize: '1.5rem', 
              color: '#333', 
              marginBottom: '20px' 
            } 
          }, 'Platform Connections'),
          
          React.createElement('div', { 
            key: 'platforms-grid',
            style: { 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
              gap: '20px'
            }
          }, 
            ['Facebook', 'Instagram', 'LinkedIn', 'X', 'YouTube'].map(platform => {
              const connected = platforms.some(p => p.platform === platform.toLowerCase());
              return React.createElement('div', {
                key: platform,
                style: {
                  padding: '20px',
                  border: `2px solid ${connected ? '#10b981' : '#e5e7eb'}`,
                  borderRadius: '8px',
                  backgroundColor: connected ? '#f0fdf4' : '#f9fafb',
                  transition: 'all 0.3s ease'
                }
              }, [
                React.createElement('div', { 
                  key: 'platform-header', 
                  style: { 
                    display: 'flex', 
                    alignItems: 'center', 
                    marginBottom: '15px' 
                  } 
                }, [
                  React.createElement('div', {
                    key: 'platform-icon',
                    style: {
                      width: '40px',
                      height: '40px',
                      backgroundColor: connected ? '#10b981' : '#6b7280',
                      borderRadius: '50%',
                      marginRight: '15px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontSize: '1.2rem'
                    }
                  }, platform.charAt(0)),
                  React.createElement('div', { key: 'platform-info' }, [
                    React.createElement('h4', { 
                      key: 'platform-name', 
                      style: { 
                        margin: 0, 
                        fontSize: '1.1rem', 
                        color: '#333' 
                      } 
                    }, platform),
                    React.createElement('p', { 
                      key: 'platform-status', 
                      style: { 
                        margin: '5px 0 0', 
                        fontSize: '0.9rem',
                        color: connected ? '#10b981' : '#6b7280'
                      } 
                    }, connected ? 'Connected' : 'Not Connected')
                  ])
                ]),
                
                React.createElement('button', {
                  key: 'connect-btn',
                  onClick: () => {
                    window.open(`/connect/${platform.toLowerCase()}`, '_blank', 'width=600,height=700');
                  },
                  style: {
                    width: '100%',
                    padding: '12px 20px',
                    backgroundColor: connected ? '#10b981' : '#3b82f6',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '1rem',
                    fontWeight: '500',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }
                }, connected ? 'Reconnect' : 'Connect')
              ]);
            })
          )
        ]),
        
        // Quick actions
        React.createElement('div', {
          key: 'actions',
          style: {
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '20px'
          }
        }, [
          React.createElement('div', {
            key: 'schedule-action',
            style: {
              backgroundColor: 'white',
              padding: '30px',
              borderRadius: '12px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
              textAlign: 'center',
              cursor: 'pointer'
            },
            onClick: () => window.location.href = '/schedule'
          }, [
            React.createElement('h4', { 
              key: 'schedule-title', 
              style: { 
                margin: '0 0 10px', 
                color: '#333' 
              } 
            }, 'Schedule Posts'),
            React.createElement('p', { 
              key: 'schedule-desc', 
              style: { 
                margin: 0, 
                color: '#666' 
              } 
            }, 'Create and schedule your content')
          ]),
          
          React.createElement('div', {
            key: 'analytics-action',
            style: {
              backgroundColor: 'white',
              padding: '30px',
              borderRadius: '12px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
              textAlign: 'center',
              cursor: 'pointer'
            },
            onClick: () => window.location.href = '/analytics'
          }, [
            React.createElement('h4', { 
              key: 'analytics-title', 
              style: { 
                margin: '0 0 10px', 
                color: '#333' 
              } 
            }, 'Analytics'),
            React.createElement('p', { 
              key: 'analytics-desc', 
              style: { 
                margin: 0, 
                color: '#666' 
              } 
            }, 'View your performance metrics')
          ])
        ])
      ])
    ])
  ]);
}

// Simple login component
function Login({ onLogin }) {
  const [email, setEmail] = useState('gailm@macleodglba.com.au');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  
  async function handleLogin(e) {
    e.preventDefault();
    setLoading(true);
    
    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      
      if (response.ok) {
        const userData = await response.json();
        onLogin(userData);
      } else {
        alert('Login failed. Please check your credentials.');
      }
    } catch (error) {
      console.error('Login error:', error);
      alert('Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }
  
  return React.createElement('div', {
    style: {
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #3250fa, #00f0ff)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }
  }, [
    React.createElement('div', {
      key: 'login-card',
      style: {
        backgroundColor: 'white',
        padding: '50px',
        borderRadius: '20px',
        boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
        width: '100%',
        maxWidth: '400px',
        margin: '20px'
      }
    }, [
      React.createElement('div', {
        key: 'header',
        style: { textAlign: 'center', marginBottom: '40px' }
      }, [
        React.createElement('h1', { 
          key: 'title', 
          style: { 
            fontSize: '2.5rem', 
            color: '#333', 
            marginBottom: '10px' 
          } 
        }, 'TheAgencyIQ'),
        React.createElement('p', { 
          key: 'subtitle', 
          style: { 
            color: '#666', 
            fontSize: '1.1rem' 
          } 
        }, 'Sign in to your account')
      ]),
      
      React.createElement('form', { key: 'form', onSubmit: handleLogin }, [
        React.createElement('div', { 
          key: 'email-group', 
          style: { marginBottom: '25px' } 
        }, [
          React.createElement('label', { 
            key: 'email-label', 
            style: { 
              display: 'block', 
              marginBottom: '8px', 
              color: '#333',
              fontWeight: '500'
            } 
          }, 'Email Address'),
          React.createElement('input', {
            key: 'email-input',
            type: 'email',
            value: email,
            onChange: (e) => setEmail(e.target.value),
            style: {
              width: '100%',
              padding: '15px',
              border: '2px solid #e5e7eb',
              borderRadius: '8px',
              fontSize: '1rem',
              boxSizing: 'border-box',
              transition: 'border-color 0.2s ease'
            },
            required: true
          })
        ]),
        
        React.createElement('div', { 
          key: 'password-group', 
          style: { marginBottom: '30px' } 
        }, [
          React.createElement('label', { 
            key: 'password-label', 
            style: { 
              display: 'block', 
              marginBottom: '8px', 
              color: '#333',
              fontWeight: '500'
            } 
          }, 'Password'),
          React.createElement('input', {
            key: 'password-input',
            type: 'password',
            value: password,
            onChange: (e) => setPassword(e.target.value),
            style: {
              width: '100%',
              padding: '15px',
              border: '2px solid #e5e7eb',
              borderRadius: '8px',
              fontSize: '1rem',
              boxSizing: 'border-box',
              transition: 'border-color 0.2s ease'
            },
            required: true
          })
        ]),
        
        React.createElement('button', {
          key: 'submit',
          type: 'submit',
          disabled: loading,
          style: {
            width: '100%',
            padding: '15px',
            background: 'linear-gradient(135deg, #3250fa, #00f0ff)',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '1.1rem',
            fontWeight: '600',
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.7 : 1,
            transition: 'all 0.2s ease'
          }
        }, loading ? 'Signing in...' : 'Sign In')
      ])
    ])
  ]);
}

// Main app component
function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    async function checkAuth() {
      try {
        const userData = await apiCall('/api/user');
        console.log('User data:', userData);
        
        if (userData && userData.id) {
          setUser(userData);
        }
      } catch (error) {
        console.log('No active session, showing login');
      } finally {
        setLoading(false);
      }
    }
    checkAuth();
  }, []);
  
  if (loading) {
    return React.createElement('div', {
      style: {
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #3250fa, #00f0ff)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        fontFamily: 'system-ui, -apple-system, sans-serif'
      }
    }, [
      React.createElement('div', {
        key: 'loading-content',
        style: { textAlign: 'center' }
      }, [
        React.createElement('h1', { 
          key: 'title', 
          style: { fontSize: '3rem', marginBottom: '20px' } 
        }, 'TheAgencyIQ'),
        React.createElement('p', { 
          key: 'subtitle', 
          style: { fontSize: '1.2rem', opacity: 0.9 } 
        }, 'Social Media Automation Platform'),
        React.createElement('div', {
          key: 'loading-spinner',
          style: {
            width: '40px',
            height: '40px',
            border: '4px solid rgba(255,255,255,0.3)',
            borderTop: '4px solid white',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '20px auto'
          }
        })
      ])
    ]);
  }
  
  return user ? 
    React.createElement(Dashboard, { user }) : 
    React.createElement(Login, { onLogin: setUser });
}

// Export for use in the main HTML file
window.TheAgencyIQApp = App;