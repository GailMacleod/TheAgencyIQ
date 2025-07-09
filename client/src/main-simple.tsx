import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';

// Ensure React is globally available before any JSX
(window as any).React = React;
(globalThis as any).React = React;

// Simple component to test React rendering
const App = () => {
  return React.createElement('div', { 
    style: { 
      padding: '20px', 
      fontFamily: 'Arial, sans-serif',
      backgroundColor: '#f0f0f0',
      minHeight: '100vh'
    }
  }, 
    React.createElement('h1', { 
      style: { 
        color: '#333',
        marginBottom: '20px'
      }
    }, 'TheAgencyIQ - Loading...'),
    React.createElement('p', { 
      style: { 
        color: '#666',
        fontSize: '16px'
      }
    }, 'React is working correctly! The application is initializing.'),
    React.createElement('div', {
      style: {
        marginTop: '20px',
        padding: '10px',
        backgroundColor: '#e8f5e8',
        borderRadius: '5px',
        border: '1px solid #4caf50'
      }
    }, 'System Status: ✅ React loaded successfully')
  );
};

// Initialize the app
const container = document.getElementById('root');
if (container) {
  const root = ReactDOM.createRoot(container);
  root.render(React.createElement(App));
} else {
  console.error('Root element not found');
}