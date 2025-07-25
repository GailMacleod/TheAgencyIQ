import { Request, Response, NextFunction } from 'express';

interface ConsentRequest extends Request {
  session: any;
  cookieConsent?: {
    essential: boolean;
    analytics: boolean;
    marketing: boolean;
  };
}

// Cookie consent middleware
export function cookieConsentMiddleware(req: ConsentRequest, res: Response, next: NextFunction) {
  // Parse consent from headers or cookies
  const consentHeader = req.headers['x-cookie-consent'];
  const consentCookie = req.cookies['cookie-consent'];
  
  let consent = {
    essential: true, // Always allowed for basic functionality
    analytics: false,
    marketing: false
  };
  
  // Parse consent from cookie or header
  if (consentCookie) {
    try {
      consent = { ...consent, ...JSON.parse(decodeURIComponent(consentCookie)) };
    } catch (e) {
      console.log('Invalid cookie consent format, using defaults');
    }
  } else if (consentHeader) {
    try {
      consent = { ...consent, ...JSON.parse(consentHeader as string) };
    } catch (e) {
      console.log('Invalid consent header format, using defaults');
    }
  }
  
  // Add consent to request for downstream use
  req.cookieConsent = consent;
  
  // Set secure consent cookie if not present
  if (!consentCookie && req.session) {
    const consentString = encodeURIComponent(JSON.stringify(consent));
    const isProduction = process.env.NODE_ENV === 'production';
    
    res.cookie('cookie-consent', consentString, {
      httpOnly: false, // Allow JS access for consent management
      secure: isProduction,
      sameSite: isProduction ? 'strict' : 'lax',
      maxAge: 365 * 24 * 60 * 60 * 1000, // 1 year
      path: '/'
    });
  }
  
  next();
}

// Consent enforcement middleware for analytics endpoints
export function requireAnalyticsConsent(req: ConsentRequest, res: Response, next: NextFunction) {
  if (!req.cookieConsent?.analytics) {
    return res.status(403).json({ 
      error: 'Analytics consent required',
      message: 'Please accept analytics cookies to use this feature'
    });
  }
  next();
}

// Consent enforcement middleware for marketing endpoints
export function requireMarketingConsent(req: ConsentRequest, res: Response, next: NextFunction) {
  if (!req.cookieConsent?.marketing) {
    return res.status(403).json({ 
      error: 'Marketing consent required',
      message: 'Please accept marketing cookies to use this feature'
    });
  }
  next();
}