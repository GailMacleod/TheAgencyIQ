/**
 * DIRECT BROWSER SESSION FIX
 * Fix the cookie transmission issue preventing session persistence
 */

const fs = require('fs');

// The issue is that the frontend session manager is not properly handling the Set-Cookie headers
// from the /api/establish-session response. The server is setting cookies, but the browser
// is not using them for subsequent requests.

// Fix 1: Update session manager to force cookie persistence
const sessionManagerPath = 'client/src/utils/session-manager.ts';
const sessionManagerContent = fs.readFileSync(sessionManagerPath, 'utf8');

// The core issue is in the doEstablishSession method - it's not properly handling
// the Set-Cookie headers from the response
const updatedContent = sessionManagerContent.replace(
  /console\.log\('✅ Session establishment response:', data\);/,
  `console.log('✅ Session establishment response:', data);
        
        // CRITICAL FIX: Force browser to use the session cookies
        // The server sets cookies via Set-Cookie headers, but browser needs manual intervention
        const cookieHeader = response.headers.get('set-cookie');
        if (cookieHeader) {
          console.log('🍪 Set-Cookie header found:', cookieHeader);
          
          // Extract session cookie from Set-Cookie header
          const sessionCookieMatch = cookieHeader.match(/theagencyiq\\.session=([^;]+)/);
          if (sessionCookieMatch) {
            const sessionCookieValue = sessionCookieMatch[1];
            console.log('📋 Extracted session cookie:', sessionCookieValue);
            
            // Force browser to set the cookie manually
            document.cookie = \`theagencyiq.session=\${sessionCookieValue}; path=/; max-age=86400; SameSite=Lax\`;
            
            // Store for manual transmission
            sessionStorage.setItem('sessionCookie', \`theagencyiq.session=\${sessionCookieValue}\`);
          }
        }`
);

fs.writeFileSync(sessionManagerPath, updatedContent);

console.log('✅ Session manager updated to force cookie persistence');
console.log('📋 Browser will now manually set session cookies from Set-Cookie headers');
console.log('🔧 This should fix the cookie transmission issue preventing session persistence');