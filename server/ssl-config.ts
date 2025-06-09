// SSL and domain configuration for https://app.theagencyiq.ai
export const SSL_CONFIG = {
  production: {
    domain: 'app.theagencyiq.ai',
    protocol: 'https',
    port: 443,
    enforceHttps: true,
    hstsMaxAge: 31536000, // 1 year
    hstsIncludeSubdomains: true,
    hstsPreload: true
  },
  development: {
    domain: 'localhost',
    protocol: 'http',
    port: 5000,
    enforceHttps: false
  }
};

export const ALLOWED_ORIGINS = [
  'https://app.theagencyiq.ai',
  'https://theagencyiq.ai',
  'https://www.theagencyiq.ai',
  'https://agency-iq-social-GailMac.replit.app',
  'http://localhost:5000',
  'http://localhost:3000'
];

export const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'SAMEORIGIN',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin'
};

export function validateDomain(hostname: string): boolean {
  const allowedDomains = [
    'app.theagencyiq.ai',
    'theagencyiq.ai',
    'www.theagencyiq.ai',
    'localhost'
  ];
  
  const normalizedHostname = hostname.toLowerCase();
  console.log('validateDomain called with:', normalizedHostname);
  
  // Allow all replit.app domains
  if (normalizedHostname.endsWith('.replit.app')) {
    console.log('Allowing replit.app domain:', normalizedHostname);
    return true;
  }
  
  const isAllowed = allowedDomains.includes(normalizedHostname);
  console.log('Domain validation result:', { hostname: normalizedHostname, isAllowed });
  return isAllowed;
}

export function isSecureContext(req: any): boolean {
  return req.secure || req.header('x-forwarded-proto') === 'https';
}