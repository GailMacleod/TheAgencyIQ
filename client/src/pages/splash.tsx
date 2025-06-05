import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Zap, Target, Calendar, BarChart3, Users, Sparkles, CheckCircle, ArrowRight, Cpu, Lightbulb } from "lucide-react";
import GrokWidget from "@/components/grok-widget";

export default function Splash() {
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-border/40">
        <div className="container-atomiq">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-gradient-atomiq rounded-xl flex items-center justify-center">
                <Cpu className="h-6 w-6 text-white" />
              </div>
              <span className="ml-3 text-2xl font-bold bg-gradient-atomiq bg-clip-text text-transparent">
                AtomIQ
              </span>
            </div>
            <div className="flex items-center space-x-6">
              <Link href="/login">
                <Button variant="ghost" className="nav-link">Sign In</Button>
              </Link>
              <Link href="/subscription">
                <Button className="btn-atomiq-primary">Get Started</Button>
              </Link>
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
                  <span className="block">Social Media</span>
                  <span className="block bg-gradient-atomiq bg-clip-text text-transparent">
                    Automation
                  </span>
                  <span className="block text-3xl md:text-4xl lg:text-5xl text-muted-foreground font-medium">
                    Smarter, Together
                  </span>
                </h1>
                <p className="text-xl text-muted-foreground leading-relaxed max-w-xl">
                  Complete waterfall workflow for Queensland small businesses. From brand purpose to automated posting with AI-powered content generation.
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <Link href="/subscription">
                  <Button className="btn-atomiq-primary text-lg px-8 py-4">
                    Start Free Trial
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
                <Link href="#features">
                  <Button variant="outline" className="btn-atomiq-secondary text-lg px-8 py-4">
                    Learn More
                  </Button>
                </Link>
              </div>

              <div className="grid grid-cols-2 gap-6 text-sm">
                <div className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                  <span>Saves time: everything automated</span>
                </div>
                <div className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                  <span>Improves results: brand-aligned content</span>
                </div>
                <div className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                  <span>Affordable: plans for all budgets</span>
                </div>
                <div className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                  <span>Peace of mind: secure and compliant</span>
                </div>
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
                      <div className="flex items-center space-x-3">
                        <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                        <span className="text-sm">Platforms Connected</span>
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
              </div>
              <div className="absolute inset-0 bg-gradient-atomiq rounded-2xl blur-3xl opacity-20 scale-110"></div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="section-spacing bg-white">
        <div className="container-atomiq">
          <div className="text-center space-y-4 mb-16">
            <h2 className="text-base font-semibold text-primary tracking-wide uppercase">
              Technology Intelligence
            </h2>
            <h3 className="text-4xl md:text-5xl font-bold">
              Everything you need for social media success
            </h3>
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

      {/* CTA Section */}
      <section className="section-spacing bg-gradient-atomiq">
        <div className="container-atomiq text-center text-white">
          <div className="max-w-4xl mx-auto space-y-8">
            <h2 className="text-4xl md:text-5xl font-bold">
              Ready to grow your business?
            </h2>
            <p className="text-xl opacity-90 leading-relaxed">
              Join Queensland businesses already using AtomIQ to automate their social media success with intelligent technology.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/subscription">
                <Button size="lg" className="bg-white text-primary hover:bg-white/90 text-lg px-8 py-4">
                  Start Free Trial
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link href="/login">
                <Button size="lg" variant="outline" className="border-white text-white hover:bg-white hover:text-primary text-lg px-8 py-4">
                  Sign In
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-card border-t">
        <div className="container-atomiq py-16">
          <div className="grid md:grid-cols-4 gap-8">
            <div className="space-y-4">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-gradient-atomiq rounded-xl flex items-center justify-center">
                  <Cpu className="h-6 w-6 text-white" />
                </div>
                <span className="ml-3 text-2xl font-bold bg-gradient-atomiq bg-clip-text text-transparent">
                  AtomIQ
                </span>
              </div>
              <p className="text-muted-foreground leading-relaxed">
                Smarter social media automation for Queensland businesses. Technology and intelligence working together.
              </p>
            </div>
            
            <div className="space-y-4">
              <h5 className="font-semibold">Product</h5>
              <div className="space-y-2">
                <Link href="/subscription" className="nav-link block">Pricing</Link>
                <Link href="#features" className="nav-link block">Features</Link>
              </div>
            </div>
            
            <div className="space-y-4">
              <h5 className="font-semibold">Company</h5>
              <div className="space-y-2">
                <a href="#" className="nav-link block">About</a>
                <a href="#" className="nav-link block">Contact</a>
              </div>
            </div>
            
            <div className="space-y-4">
              <h5 className="font-semibold">Support</h5>
              <div className="space-y-2">
                <a href="#" className="nav-link block">Help Center</a>
                <a href="#" className="nav-link block">Documentation</a>
              </div>
            </div>
          </div>
          
          <div className="border-t border-border mt-12 pt-8 text-center">
            <p className="text-muted-foreground">
              &copy; 2024 AtomIQ Technologies. All rights reserved.
            </p>
          </div>
        </div>
      </footer>

      <GrokWidget />
    </div>
  );
}
