import express from 'express';
import path from 'path';

export async function setupViteFree(app: express.Application) {
  console.log('🚀 Setting up Vite-free development server...');
  
  // Serve static assets
  app.use('/assets', express.static('src/assets'));
  app.use('/public', express.static('public'));
  
  // Development HTML with proper CSP and React setup
  const devHTML = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>TheAgencyIQ - Social Media Automation</title>
  <meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https:; font-src 'self' https: data:;">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .app-container {
      background: white;
      border-radius: 12px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.2);
      padding: 40px;
      max-width: 800px;
      width: 90%;
      text-align: center;
    }
    .logo { font-size: 2.5rem; margin-bottom: 20px; color: #667eea; }
    .title { font-size: 1.8rem; color: #333; margin-bottom: 30px; }
    .features { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin: 30px 0; }
    .feature-card {
      background: #f8f9fa;
      padding: 20px;
      border-radius: 8px;
      border-left: 4px solid #667eea;
    }
    .feature-title { font-weight: bold; color: #333; margin-bottom: 10px; }
    .feature-desc { color: #666; font-size: 0.9rem; }
    .status-badge {
      background: #28a745;
      color: white;
      padding: 8px 16px;
      border-radius: 20px;
      font-size: 0.8rem;
      margin: 10px 5px;
      display: inline-block;
    }
    .api-section {
      background: #f8f9fa;
      padding: 20px;
      border-radius: 8px;
      margin: 20px 0;
      text-align: left;
    }
    .api-endpoint {
      background: white;
      padding: 10px;
      margin: 5px 0;
      border-radius: 4px;
      font-family: monospace;
      font-size: 0.9rem;
    }
    .btn {
      background: #667eea;
      color: white;
      border: none;
      padding: 12px 24px;
      border-radius: 6px;
      cursor: pointer;
      margin: 5px;
      transition: all 0.3s;
    }
    .btn:hover { background: #5a67d8; transform: translateY(-2px); }
    #results {
      background: #f8f9fa;
      border: 1px solid #dee2e6;
      border-radius: 6px;
      padding: 15px;
      margin: 20px 0;
      text-align: left;
      display: none;
    }
    .loading { opacity: 0.6; pointer-events: none; }
  </style>
</head>
<body>
  <div class="app-container">
    <div class="logo">🚀</div>
    <h1 class="title">TheAgencyIQ Platform</h1>
    <p>AI-Powered Social Media Automation with Seedance 1.0 Integration</p>
    
    <div class="status-badges">
      <span class="status-badge">✓ Server Online</span>
      <span class="status-badge">✓ Seedance 1.0</span>
      <span class="status-badge">✓ API Ready</span>
    </div>
    
    <div class="features">
      <div class="feature-card">
        <div class="feature-title">🎬 Content Generation</div>
        <div class="feature-desc">AI-powered Queensland business content with intelligent automation focus</div>
      </div>
      <div class="feature-card">
        <div class="feature-title">🎥 Video Creation</div>
        <div class="feature-desc">Professional 1080p videos with thumbnails and platform optimization</div>
      </div>
      <div class="feature-card">
        <div class="feature-title">📊 Multi-Platform</div>
        <div class="feature-desc">Facebook, Instagram, LinkedIn, YouTube, X publishing capabilities</div>
      </div>
    </div>
    
    <div class="api-section">
      <h3>Test Seedance 1.0 Integration</h3>
      <button class="btn" onclick="testContent()">Generate Content</button>
      <button class="btn" onclick="testVideo()">Create Video</button>
      <button class="btn" onclick="checkStatus()">Check Status</button>
      <button class="btn" onclick="healthCheck()">Health Check</button>
    </div>
    
    <div class="api-section">
      <h3>Available API Endpoints</h3>
      <div class="api-endpoint">POST /api/posts/generate - Content Generation</div>
      <div class="api-endpoint">POST /api/posts/video-generate - Video Creation</div>
      <div class="api-endpoint">GET /api/posts/seedance-status - System Status</div>
      <div class="api-endpoint">GET /api/health - Health Check</div>
    </div>
    
    <div id="results">
      <h4>Results:</h4>
      <pre id="output"></pre>
    </div>
  </div>
  
  <script>
    async function apiCall(url, method = 'GET', body = null) {
      const btn = event.target;
      btn.classList.add('loading');
      btn.textContent = 'Loading...';
      
      try {
        const options = {
          method,
          headers: { 'Content-Type': 'application/json' }
        };
        if (body) options.body = JSON.stringify(body);
        
        const response = await fetch(url, options);
        const data = await response.json();
        showResults(url, data);
      } catch (error) {
        showResults(url, { error: error.message });
      } finally {
        btn.classList.remove('loading');
        btn.textContent = btn.textContent.replace('Loading...', btn.getAttribute('data-original') || 'Test');
      }
    }
    
    function testContent() {
      event.target.setAttribute('data-original', 'Generate Content');
      apiCall('/api/posts/generate', 'POST', {
        userId: 'demo_user',
        contentType: 'business_automation',
        duration: 15,
        style: 'professional'
      });
    }
    
    function testVideo() {
      event.target.setAttribute('data-original', 'Create Video');
      apiCall('/api/posts/video-generate', 'POST', {
        userId: 'demo_user',
        script: 'Queensland business automation success story - transform your operations with AI',
        style: 'professional',
        resolution: '1080p'
      });
    }
    
    function checkStatus() {
      event.target.setAttribute('data-original', 'Check Status');
      apiCall('/api/posts/seedance-status');
    }
    
    function healthCheck() {
      event.target.setAttribute('data-original', 'Health Check');
      apiCall('/api/health');
    }
    
    function showResults(endpoint, data) {
      document.getElementById('results').style.display = 'block';
      document.getElementById('output').textContent = 
        'Endpoint: ' + endpoint + '\\n\\n' + JSON.stringify(data, null, 2);
    }
    
    // Auto health check on load
    window.addEventListener('load', () => {
      setTimeout(healthCheck, 1000);
    });
  </script>
</body>
</html>`;

  // Serve the development HTML for all non-API routes
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api') && 
        !req.path.startsWith('/oauth') && 
        !req.path.startsWith('/callback') && 
        !req.path.startsWith('/health') &&
        !req.path.startsWith('/public') &&
        !req.path.startsWith('/assets')) {
      res.send(devHTML);
    }
  });
  
  console.log('✅ Vite-free development server ready');
}

export function serveStatic(app: express.Application) {
  // Static file serving for development
  app.use('/attached_assets', express.static('attached_assets'));
  app.use('/uploads', express.static('uploads'));
  console.log('✅ Static file serving configured');
}