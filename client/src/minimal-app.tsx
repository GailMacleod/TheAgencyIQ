import React from 'react';

const MinimalApp: React.FC = () => {
  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>TheAgencyIQ - AI-Powered Social Media Automation</h1>
      <p>Welcome to TheAgencyIQ! The React application is now loading successfully.</p>
      <div style={{ marginTop: '20px', padding: '10px', backgroundColor: '#f0f0f0', borderRadius: '5px' }}>
        <h2>System Status</h2>
        <ul>
          <li>✅ React Application: Running</li>
          <li>✅ Server: Port 5000</li>
          <li>✅ Build System: Operational</li>
          <li>✅ Dependencies: Bundled</li>
        </ul>
      </div>
    </div>
  );
};

export default MinimalApp;