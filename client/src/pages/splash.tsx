import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Zap, Target, Calendar, BarChart3, Users, Sparkles, CheckCircle, ArrowRight, Cpu, Lightbulb, Film } from "lucide-react";
import { SiFacebook, SiInstagram, SiLinkedin, SiYoutube, SiTiktok, SiX } from "react-icons/si";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import GrokWidget from "@/components/grok-widget";
import UserMenu from "@/components/user-menu";
import agencyLogoPath from "@assets/agency_logo_1749083054761.png";

export default function Splash() {
  const [location] = useLocation();
  const [showSignupAnimation, setShowSignupAnimation] = useState(false);
  
  const { data: user } = useQuery({
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

  return (
    <div className="min-h-screen bg-background">
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
            <div className="flex items-center space-x-6">
              {user ? (
                <UserMenu />
              ) : (
                <>
                  <Link href="/login">
                    <Button variant="ghost" className="nav-link">Sign In</Button>
                  </Link>
                  <Link href="/subscription">
                    <Button 
                      className={`btn-atomiq-primary transition-all duration-500 ${
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
      <section className="hero-gradient section-spacing">
        <div className="container-atomiq">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8 animate-fade-in-up">
              <div className="space-y-6">
                <div className="inline-flex items-center px-4 py-2 bg-primary/10 rounded-full text-primary text-sm font-medium">
                  <Lightbulb className="h-4 w-4 mr-2" />
                  Technology Intelligence
                </div>
                <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold leading-tight">
                  <span className="block bg-gradient-atomiq bg-clip-text text-transparent">Automate Social Media, get your sleep back</span>
                  
                </h1>
                <p className="text-xl text-muted-foreground leading-relaxed max-w-xl">Complete waterfall workflow to drive small businesses's online social presence.</p>
              </div>
              
              {/* Platform logos for education */}
              <div className="platform-logos flex justify-center items-center space-x-8">
                <SiFacebook className="w-8 h-8" style={{ color: '#1877F2' }} />
                <SiInstagram className="w-8 h-8" style={{ color: '#E4405F' }} />
                <SiLinkedin className="w-8 h-8" style={{ color: '#0A66C2' }} />
                <SiYoutube className="w-8 h-8" style={{ color: '#FF0000' }} />
                <SiTiktok className="w-8 h-8" style={{ color: '#000000' }} />
                <SiX className="w-8 h-8" style={{ color: '#000000' }} />
              </div>


            </div>

            <div className="relative animate-slide-in-right">
              <div className="relative z-10">
                <div className="card-atomiq p-8 space-y-6 max-w-md ml-auto">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Workflow Progress</span>
                      <span className="text-xs text-muted-foreground">75% Complete</span>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center space-x-3">
                        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                        <span className="text-sm">Brand Purpose Defined</span>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center space-x-3">
                          <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                          <span className="text-sm">The AgencyIQ automates posts to your social media accounts (have your login details ready).</span>
                        </div>
                        <div className="pl-6 space-y-1">
                          <div className="flex items-center space-x-2">
                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                            <span className="text-xs">Facebook</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <div className="w-2 h-2 bg-pink-500 rounded-full"></div>
                            <span className="text-xs">Instagram</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <div className="w-2 h-2 bg-black rounded-full"></div>
                            <span className="text-xs">TikTok</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                            <span className="text-xs">YouTube</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <div className="w-2 h-2 bg-blue-700 rounded-full"></div>
                            <span className="text-xs">LinkedIn</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <div className="w-2 h-2 bg-black rounded-full"></div>
                            <span className="text-xs">X</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <div className="w-3 h-3 bg-purple-500 rounded-full animate-pulse"></div>
                        <span className="text-sm">Content Generating...</span>
                      </div>
                    </div>
                    <div className="border-t pt-4">
                      <p className="text-xs text-muted-foreground mb-2">52 posts scheduled this month</p>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div className="bg-gradient-atomiq h-2 rounded-full w-3/4 transition-all duration-1000"></div>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Video Feature Description - Centered under card */}
                <div className="mt-6 flex justify-center max-w-md ml-auto">
                  <div className="px-6 py-2 rounded-full text-sm font-bold text-black flex items-center gap-2" style={{ backgroundColor: '#00f0ff' }}>
                    <Film className="w-4 h-4" />
                    Includes video shorts fast, text-to-video animation
                  </div>
                </div>
              </div>
              <div className="absolute inset-0 bg-gradient-atomiq rounded-2xl blur-3xl opacity-20 scale-110"></div>
            </div>
          </div>
        </div>
      </section>
      {/* Call to Action Section */}
      <section className="py-20 bg-muted/30" id="pricing">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="space-y-6">
            
            <p className="tracking-wider uppercase font-extrabold text-[20px] text-[#3b5cff]">BETA - LIMITED USERS</p>
            <Link href="/subscription">
              <Button 
                size="lg" 
                className="bg-gradient-atomiq hover:opacity-90 text-white px-8 py-4 text-lg
                          animate-enhanced-pulse hover:animate-none
                          transition-all duration-300 ease-in-out
                          hover:scale-105 hover:shadow-2xl
                          transform-gpu will-change-transform
                          hover:bg-gradient-to-r hover:from-blue-500 hover:to-cyan-400
                          active:scale-95 active:transition-none"
              >
                Choose Your Plan
              </Button>
            </Link>
            

          </div>
        </div>
      </section>
      {/* Features Section */}
      <section id="features" className="section-spacing bg-white">
        <div className="container-atomiq">
          <div className="text-center space-y-4 mb-16">
            
            <h3 className="text-4xl md:text-5xl font-bold text-[#3b5cff]">6 Simple Steps </h3>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Our AI-powered platform handles your entire social media workflow with modern technology and intelligent automation
            </p>
          </div>

          <div className="feature-grid">
            <div className="card-atomiq-feature animate-fade-in-up stagger-1">
              <div className="w-16 h-16 bg-gradient-atomiq rounded-2xl flex items-center justify-center mb-6 mx-auto">
                <Target className="h-8 w-8 text-white" />
              </div>
              <h4 className="text-xl font-semibold mb-4">Brand Purpose Definition</h4>
              <p className="text-muted-foreground leading-relaxed">
                Define your brand's core purpose, target audience, and business goals with intelligent AI guidance and strategic insights.
              </p>
            </div>

            <div className="card-atomiq-feature animate-fade-in-up stagger-2">
              <div className="w-16 h-16 bg-gradient-secondary rounded-2xl flex items-center justify-center mb-6 mx-auto">
                <Users className="h-8 w-8 text-white" />
              </div>
              <h4 className="text-xl font-semibold mb-4">Platform Connections</h4>
              <p className="text-muted-foreground leading-relaxed">
                Seamlessly connect all your social media platforms: Facebook, Instagram, LinkedIn, YouTube, and TikTok.
              </p>
            </div>

            <div className="card-atomiq-feature animate-fade-in-up stagger-3">
              <div className="w-16 h-16 bg-gradient-atomiq rounded-2xl flex items-center justify-center mb-6 mx-auto">
                <Zap className="h-8 w-8 text-white" />
              </div>
              <h4 className="text-xl font-semibold mb-4">AI Content Generation</h4>
              <p className="text-muted-foreground leading-relaxed">
                Generate engaging, brand-aligned content automatically using advanced AI technology based on your unique brand purpose.
              </p>
            </div>

            <div className="card-atomiq-feature animate-fade-in-up stagger-4">
              <div className="w-16 h-16 bg-gradient-secondary rounded-2xl flex items-center justify-center mb-6 mx-auto">
                <Calendar className="h-8 w-8 text-white" />
              </div>
              <h4 className="text-xl font-semibold mb-4">Smart Scheduling</h4>
              <p className="text-muted-foreground leading-relaxed">
                Optimize posting times and maintain consistent presence across all platforms with intelligent scheduling algorithms.
              </p>
            </div>

            <div className="card-atomiq-feature animate-fade-in-up stagger-5">
              <div className="w-16 h-16 bg-gradient-atomiq rounded-2xl flex items-center justify-center mb-6 mx-auto">
                <BarChart3 className="h-8 w-8 text-white" />
              </div>
              <h4 className="text-xl font-semibold mb-4">Analytics & Insights</h4>
              <p className="text-muted-foreground leading-relaxed">
                Track performance metrics and receive actionable insights to continuously improve your social media strategy.
              </p>
            </div>

            <div className="card-atomiq-feature animate-fade-in-up stagger-6">
              <div className="w-16 h-16 bg-gradient-secondary rounded-2xl flex items-center justify-center mb-6 mx-auto">
                <Sparkles className="h-8 w-8 text-white" />
              </div>
              <h4 className="text-xl font-semibold mb-4">Queensland Focus</h4>
              <p className="text-muted-foreground leading-relaxed">
                Specifically designed for Queensland small businesses with local market insights and compliance considerations.
              </p>
            </div>
          </div>
        </div>
      </section>
      {/* Footer */}
      <footer className="bg-card border-t">
        <div className="container-atomiq py-16">
          <div className="max-w-md mx-auto text-center space-y-6">
            <div className="flex justify-center">
              <img 
                src={agencyLogoPath} 
                alt="The AgencyIQ" 
                className="h-12 w-auto"
              />
            </div>
            <p className="text-muted-foreground leading-relaxed">
              Smarter social media automation for Queensland businesses. Technology and intelligence working together.
            </p>
          </div>
          
          <div className="border-t border-border mt-12 pt-8 text-center space-y-6">
            {/* Security & Compliance Trust Badges - Shield Style */}
            <div className="flex flex-wrap justify-center items-center gap-6 py-8">
              {/* SSL Secured Shield */}
              <div className="flex flex-col items-center space-y-2">
                <div className="relative w-20 h-24 bg-gradient-to-b from-[#3b5cff] to-[#2a4bd8] rounded-t-full rounded-b-lg shadow-lg flex items-center justify-center">
                  <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                  </svg>
                  <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-white rounded-full"></div>
                </div>
                <div className="text-center">
                  <div className="text-sm font-semibold text-[#3b5cff]">SSL</div>
                  <div className="text-xs text-muted-foreground">Secured</div>
                </div>
              </div>

              {/* GDPR Compliant Shield */}
              <div className="flex flex-col items-center space-y-2">
                <div className="relative w-20 h-24 bg-gradient-to-b from-[#3b5cff] to-[#2a4bd8] rounded-t-full rounded-b-lg shadow-lg flex items-center justify-center">
                  <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 8a6 6 0 01-7.743 5.743L10 14l-1 1-1 1H6v2H2v-4l4.257-4.257A6 6 0 1118 8zm-6-4a1 1 0 100 2 2 2 0 012 2 1 1 0 102 0 4 4 0 00-4-4z" clipRule="evenodd" />
                  </svg>
                  <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-white rounded-full"></div>
                </div>
                <div className="text-center">
                  <div className="text-sm font-semibold text-[#3b5cff]">GDPR</div>
                  <div className="text-xs text-muted-foreground">Compliant</div>
                </div>
              </div>

              {/* 99.9% Uptime Shield */}
              <div className="flex flex-col items-center space-y-2">
                <div className="relative w-20 h-24 bg-gradient-to-b from-[#3b5cff] to-[#2a4bd8] rounded-t-full rounded-b-lg shadow-lg flex items-center justify-center">
                  <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                  </svg>
                  <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-white rounded-full"></div>
                </div>
                <div className="text-center">
                  <div className="text-sm font-semibold text-[#3b5cff]">99.9%</div>
                  <div className="text-xs text-muted-foreground">Uptime</div>
                </div>
              </div>

              {/* SOC 2 Type II Shield */}
              <div className="flex flex-col items-center space-y-2">
                <div className="relative w-20 h-24 bg-gradient-to-b from-[#3b5cff] to-[#2a4bd8] rounded-t-full rounded-b-lg shadow-lg flex items-center justify-center">
                  <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-white rounded-full"></div>
                </div>
                <div className="text-center">
                  <div className="text-sm font-semibold text-[#3b5cff]">SOC 2</div>
                  <div className="text-xs text-muted-foreground">Type II</div>
                </div>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row justify-center items-center gap-4 text-sm text-muted-foreground">
              <a href="https://app.theagencyiq.ai/terms" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">
                Terms of Service
              </a>
              <span className="hidden sm:block">•</span>
              <a href="https://app.theagencyiq.ai/privacy" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">
                Privacy Policy
              </a>
              <span className="hidden sm:block">•</span>
              <a href="https://app.theagencyiq.ai/security" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">
                Security Policy
              </a>
              <span className="hidden sm:block">•</span>
              <span className="text-green-600 font-medium">Contact Support - support@theagencyiq.ai</span>
            </div>
            <p className="text-muted-foreground">
              &copy; 2024 MacleodGlobal trading as The AgencyIQ. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
      <GrokWidget />
    </div>
  );
}
