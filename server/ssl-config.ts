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
  'http://localhost:5000',
  'http://localhost:3000'
];

export const SECURITY_HEADERS = {
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://checkout.stripe.com https://js.stripe.com https://www.googletagmanager.com https://replit.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com https://fonts.googleapis.com; img-src 'self' data: https:; connect-src 'self' https://api.stripe.com https://api.x.ai https://checkout.stripe.com wss://app.theagencyiq.ai; frame-src https://checkout.stripe.com https://js.stripe.com;"
};

export function validateDomain(hostname: string): boolean {
  const allowedDomains = [
    'app.theagencyiq.ai',
    'theagencyiq.ai',
    'www.theagencyiq.ai',
    'localhost'
  ];
  
  return allowedDomains.includes(hostname);
}

export function isSecureContext(req: any): boolean {
  return req.secure || req.header('x-forwarded-proto') === 'https';
}