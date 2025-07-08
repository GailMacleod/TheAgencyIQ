// Analytics module - esbuild mode (Vite-free)
// All analytics functionality disabled to prevent import.meta errors

declare global {
  interface Window {
    dataLayer: any[];
    gtag: (...args: any[]) => void;
  }
}

// Initialize Google Analytics - Disabled in esbuild mode
export const initGA = () => {
  console.log('Google Analytics disabled in esbuild mode');
  return;
};

// Track page views - Disabled in esbuild mode
export const trackPageView = (url: string) => {
  console.log('Page view tracking disabled in esbuild mode:', url);
  return;
};

// Track events - Disabled in esbuild mode
export const trackEvent = (
  action: string,
  category: string = 'General',
  label?: string,
  value?: number
) => {
  console.log('Event tracking disabled in esbuild mode:', { action, category, label, value });
  return;
};

// Track social engagement - Disabled in esbuild mode
export const trackSocialEngagement = (platform: string, action: string, content: string) => {
  console.log('Social engagement tracking disabled in esbuild mode:', { platform, action, content });
  return;
};

// Track content generation - Disabled in esbuild mode
export const trackContentGeneration = (platform: string, contentType: string) => {
  console.log('Content generation tracking disabled in esbuild mode:', { platform, contentType });
  return;
};

// Track milestones - Disabled in esbuild mode
export const trackMilestone = (milestone: string) => {
  console.log('Milestone tracking disabled in esbuild mode:', milestone);
  return;
};