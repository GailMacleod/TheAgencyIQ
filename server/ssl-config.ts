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
  replit: {
    domain: '*.replit.app',
    protocol: 'https',
    port: 443,
    enforceHttps: false, // Replit handles SSL termination
    hstsMaxAge: 0,
    hstsIncludeSubdomains: false,
    hstsPreload: false
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
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'SAMEORIGIN',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://checkout.stripe.com https://js.stripe.com https://www.googletagmanager.com https://replit.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com https://fonts.googleapis.com data:; img-src 'self' data: https:; connect-src 'self' https://api.stripe.com https://api.x.ai https://checkout.stripe.com wss://*.replit.app; frame-src https://checkout.stripe.com https://js.stripe.com;"
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