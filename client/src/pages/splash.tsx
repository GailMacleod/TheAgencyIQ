import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AnimatedIcon } from "@/components/ui/animated-icon";
import { Zap, Target, Calendar, BarChart3, Users, Sparkles, CheckCircle, ArrowRight, Cpu, Lightbulb, Film } from "lucide-react";
import { SiFacebook, SiInstagram, SiLinkedin, SiYoutube, SiX } from "react-icons/si";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import GrokWidget from "@/components/grok-widget";
import UserMenu from "@/components/user-menu";
import agencyLogoPath from "@assets/agency_logo_1024x1024 (2)_1752385824604.png";
import OnboardingWizard from "@/components/onboarding/OnboardingWizard";
import HorizontalNavigation from "@/components/HorizontalNavigation";

export default function Splash() {
  const [location] = useLocation();
  const [showSignupAnimation, setShowSignupAnimation] = useState(false);
  const [revealAnimation, setRevealAnimation] = useState(false);
  
  const { data: user, isLoading } = useQuery({
    queryKey: ["/api/user"],
    retry: false,
  });

  // Check if user completed wizard and trigger signup button animation
  useEffect(() => {
    const urlParams = new URLSearchParams(location.split('?')[1] || '');
    if (urlParams.get('wizard-completed') === 'true') {
      setShowSignupAnimation(true);
      // Remove the parameter from URL after triggering animation
      window.history.replaceState({}, '', '/');
      // Reset animation after 3 seconds
      setTimeout(() => setShowSignupAnimation(false), 3000);
    }
  }, [location]);

  // Trigger animated reveal on page load - optimized for faster loading
  useEffect(() => {
    // Start animation immediately for returning customers
    setRevealAnimation(true);
  }, []);

  return (
    <div className="min-h-screen bg-white relative overflow-hidden">
      {/* Animated Reveal Overlay - Beautiful curtain animation */}
      <div className="fixed inset-0 z-[100] pointer-events-none">
        {/* Left Panel */}
        <div 
          className={`absolute top-0 left-0 w-1/2 h-full bg-[#3B82F6] transition-transform duration-1000 ease-out ${
            revealAnimation ? 'transform -translate-x-full' : 'transform translate-x-0'
          }`}
        />
        {/* Right Panel */}
        <div 
          className={`absolute top-0 right-0 w-1/2 h-full bg-[#3B82F6] transition-transform duration-1000 ease-out ${
            revealAnimation ? 'transform translate-x-full' : 'transform translate-x-0'
          }`}
        />
      </div>
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-border/40">
        <div className="container-atomiq">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center">
              <img 
                src={agencyLogoPath} 
                alt="The AgencyIQ" 
                className="h-12 w-auto"
              />
            </div>
            <div className="flex items-center space-x-4">
              {!isLoading && user ? (
                <div className="flex items-center space-x-4">
                  <Link href="/schedule">
                    <Button variant="ghost" className="text-gray-700 hover:text-primary font-medium">
                      Dashboard
                    </Button>
                  </Link>
                  <UserMenu />
                </div>
              ) : (
                <>
                  <Link href="/login">
                    <Button variant="ghost" className="text-gray-700 hover:text-primary font-medium">
                      Sign In
                    </Button>
                  </Link>
                  <Link href="/subscription">
                    <Button 
                      className={`bg-gradient-to-r from-[#3B82F6] to-[#8B5CF6] hover:from-[#2563EB] hover:to-[#7C3AED] text-white font-medium px-6 py-2 rounded-lg shadow-lg transition-all duration-500 ${
                        showSignupAnimation 
                          ? 'animate-pulse ring-4 ring-blue-300 ring-opacity-50 scale-105 shadow-lg' 
                          : ''
                      }`}
                    >
                      Get Started
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>
      {/* Hero Section */}
      <section className="hero-gradient py-6 sm:py-12">
        <div className="container-atomiq px-4">
          <div className="flex flex-col items-center justify-center text-center space-y-4 sm:space-y-8">
            <div className="space-y-3 sm:space-y-6 animate-fade-in-up max-w-4xl w-full">
              <div className="space-y-2 sm:space-y-4">
                <div className="flex flex-col items-center space-y-2 sm:space-y-4">
                  <img 
                    src="attached_assets/On Pencil_distance education_e-learning_online education_online learning_online courses_icon.png" 
                    alt="Education & Learning Icon"
                    className="w-12 h-12 sm:w-20 sm:h-20 object-contain hover:scale-110 transition-transform duration-300"
                  />
                  <div className="inline-flex items-center px-3 py-1 sm:px-4 sm:py-2 bg-primary/10 rounded-full text-primary text-xs sm:text-sm font-medium">
                    <Lightbulb className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                    BETA
                  </div>
                </div>
                <h1 className="text-xl sm:text-5xl md:text-6xl lg:text-7xl leading-tight text-[#3250fa] px-2 font-extrabold">
                  Set & Forget
                </h1>
                <h2 className="mobile-heading sm:text-4xl md:text-5xl lg:text-6xl font-bold bg-gradient-to-r from-[#3250fa] to-[#00f0ff] bg-clip-text text-transparent px-2 text-center text-[52px]">
                  Social Media for small businesses
                </h2>
                <p className="sm:text-xl text-muted-foreground max-w-2xl mx-auto px-4 sm:px-0 text-[16px]">At its core, AgencyIQ is a first-principle powerhouse app designed to supercharge small businesses (especially Queensland SMBs) with automated social media marketing that actually drives revenue, without you lifting a finger beyond initial setup.</p>
              </div>
              
              {/* Platform logos for education */}
              <div className="platform-logos flex justify-center items-center space-x-4 sm:space-x-8">
                <SiFacebook className="w-6 h-6 sm:w-8 sm:h-8" style={{ color: '#1877F2' }} />
                <SiInstagram className="w-6 h-6 sm:w-8 sm:h-8" style={{ color: '#E4405F' }} />
                <SiLinkedin className="w-6 h-6 sm:w-8 sm:h-8" style={{ color: '#0A66C2' }} />
                <SiYoutube className="w-6 h-6 sm:w-8 sm:h-8" style={{ color: '#FF0000' }} />
                <SiX className="w-6 h-6 sm:w-8 sm:h-8" style={{ color: '#000000' }} />
              </div>
            </div>

            <div className="relative animate-slide-in-right w-full px-4 sm:px-0">
              <div className="relative z-10">
                <div className="max-w-md mx-auto">
                  <OnboardingWizard />
                </div>
                
                {/* Video Feature Description - Centered under card */}
                <div className="mt-2 sm:mt-4 flex justify-center">
                  <div className="px-4 py-1 sm:px-6 sm:py-2 rounded-full text-xs sm:text-sm font-bold text-black flex items-center gap-1 sm:gap-2" style={{ backgroundColor: '#00f0ff' }}>
                    <Film className="w-3 h-3 sm:w-4 sm:h-4" />
                    Includes text-to-video generation
                  </div>
                </div>
              </div>
              <div className="absolute inset-0 bg-gradient-atomiq rounded-2xl blur-3xl opacity-20 scale-110"></div>
            </div>
          </div>
        </div>
      </section>
      {/* Call to Action Section */}
      <section className="py-8 sm:py-20 bg-muted/30" id="pricing">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="space-y-3 sm:space-y-4">
            <Link href="/subscription">
              <Button 
                size="lg" 
                className="mobile-button relative overflow-hidden text-white px-6 py-3 sm:px-8 sm:py-4 text-lg sm:text-xl font-black tracking-wider
                          transition-all duration-300 ease-in-out
                          hover:scale-105 hover:shadow-2xl
                          transform-gpu will-change-transform
                          active:scale-95 active:transition-none"
                style={{
                  background: '#3250fa',
                  animation: 'button-pulse 2s ease-in-out infinite'
                }}
              >
                <span className="relative z-10">SUBSCRIBE NOW</span>
              </Button>
            </Link>
            
            {/* Subscription Options */}
            <div className="mt-3 sm:mt-4 bg-white rounded-lg border border-gray-200 p-3 sm:p-4 max-w-2xl mx-auto text-[#6b7280]">
              <div className="pricing-container flex flex-col sm:flex-row justify-between items-center gap-3 sm:gap-4 text-center">
                <div className="flex-1">
                  <h4 className="text-xs sm:text-sm font-semibold mb-1 text-gray-900">Starter</h4>
                  <p className="text-xs text-[#3b5cff] font-medium mb-1">$19.99/month</p>
                  <p className="text-xs text-gray-600">12 posts (10 + 2 free)</p>
                </div>
                <div className="flex-1 sm:border-l sm:border-r border-gray-200 sm:px-4">
                  <h4 className="text-xs sm:text-sm font-semibold mb-1 text-gray-900">Growth</h4>
                  <p className="text-xs text-[#3b5cff] font-medium mb-1">$41.99/month</p>
                  <p className="text-xs text-gray-600">27 posts (25 + 2 free)</p>
                </div>
                <div className="flex-1">
                  <h4 className="text-xs sm:text-sm font-semibold mb-1 text-gray-900">Professional</h4>
                  <p className="text-xs text-[#3b5cff] font-medium mb-1">$99.99/month</p>
                  <p className="text-xs text-gray-600">52 posts (50 + 2 free)</p>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>
      {/* Horizontal Navigation Section */}
      <HorizontalNavigation />


      <GrokWidget />
    </div>
  );
}
