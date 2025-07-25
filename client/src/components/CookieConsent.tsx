import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface CookiePreferences {
  essential: boolean;
  analytics: boolean;
  accepted: boolean;
}

export function CookieConsent() {
  const [showBanner, setShowBanner] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);
  const [preferences, setPreferences] = useState<CookiePreferences>({
    essential: true, // Always required
    analytics: false,
    accepted: false
  });

  useEffect(() => {
    // Check if user has already made a choice
    const cookieConsent = localStorage.getItem('cookieConsent');
    if (!cookieConsent) {
      setShowBanner(true);
    } else {
      setPreferences(JSON.parse(cookieConsent));
    }
  }, []);

  const acceptAll = () => {
    const newPrefs = { essential: true, analytics: true, accepted: true };
    setPreferences(newPrefs);
    localStorage.setItem('cookieConsent', JSON.stringify(newPrefs));
    setShowBanner(false);
    console.log('🍪 All cookies accepted');
  };

  const acceptEssential = () => {
    const newPrefs = { essential: true, analytics: false, accepted: true };
    setPreferences(newPrefs);
    localStorage.setItem('cookieConsent', JSON.stringify(newPrefs));
    setShowBanner(false);
    console.log('🍪 Essential cookies only accepted');
  };

  const savePreferences = () => {
    const newPrefs = { ...preferences, accepted: true };
    setPreferences(newPrefs);
    localStorage.setItem('cookieConsent', JSON.stringify(newPrefs));
    setShowBanner(false);
    setShowPreferences(false);
    console.log('🍪 Cookie preferences saved:', newPrefs);
  };

  const revokeConsent = () => {
    localStorage.removeItem('cookieConsent');
    setPreferences({ essential: true, analytics: false, accepted: false });
    setShowBanner(true);
    console.log('🍪 Cookie consent revoked');
  };

  if (!showBanner) {
    return (
      <Button 
        variant="outline" 
        size="sm" 
        onClick={revokeConsent}
        className="fixed bottom-4 right-4 z-50 text-xs opacity-70 hover:opacity-100"
      >
        Cookie Settings
      </Button>
    );
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-white/95 backdrop-blur border-t shadow-lg">
      <Card className="max-w-4xl mx-auto">
        <CardContent className="p-6">
          {!showPreferences ? (
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex-1">
                <h3 className="font-semibold text-lg mb-2">Cookie Notice</h3>
                <p className="text-sm text-gray-600">
                  We use essential cookies for login sessions and security. Analytics cookies help us improve our service. 
                  By continuing, you agree to our Cookie Policy.
                </p>
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button 
                  variant="outline" 
                  onClick={() => setShowPreferences(true)}
                  size="sm"
                >
                  Manage Preferences
                </Button>
                <Button 
                  variant="outline" 
                  onClick={acceptEssential}
                  size="sm"
                >
                  Essential Only
                </Button>
                <Button 
                  onClick={acceptAll}
                  size="sm"
                >
                  Accept All
                </Button>
              </div>
            </div>
          ) : (
            <div>
              <h3 className="font-semibold text-lg mb-4">Cookie Preferences</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Essential Cookies</h4>
                    <p className="text-sm text-gray-600">Required for login sessions and security</p>
                  </div>
                  <input 
                    type="checkbox" 
                    checked={preferences.essential} 
                    disabled 
                    className="w-4 h-4"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Analytics Cookies</h4>
                    <p className="text-sm text-gray-600">Help us understand how you use our service</p>
                  </div>
                  <input 
                    type="checkbox" 
                    checked={preferences.analytics}
                    onChange={(e) => setPreferences({...preferences, analytics: e.target.checked})}
                    className="w-4 h-4"
                  />
                </div>
              </div>
              <div className="flex gap-2 mt-6 justify-end">
                <Button 
                  variant="outline" 
                  onClick={() => setShowPreferences(false)}
                  size="sm"
                >
                  Back
                </Button>
                <Button 
                  onClick={savePreferences}
                  size="sm"
                >
                  Save Preferences
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}