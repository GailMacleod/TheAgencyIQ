import React from 'react';
import ReactDOM from 'react-dom/client';

// Simple TheAgencyIQ App
function App() {
  return (
    <div style={{
      padding: '20px',
      fontFamily: 'Arial, sans-serif',
      fontSize: '18px',
      backgroundColor: '#f0f0f0',
      textAlign: 'center',
      marginTop: '50px'
    }}>
      TheAgencyIQ Frontend Working!
    </div>
  );
}

// Render the app
const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(<App />);

console.log('TheAgencyIQ React app loaded successfully');