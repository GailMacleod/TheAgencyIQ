import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckIcon, Star, ArrowLeft, Cpu, Zap } from "lucide-react";
import { Link } from "wouter";
import { apiRequest } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import GrokWidget from "@/components/grok-widget";
import agencyLogoPath from "@assets/agency_logo_1749083054761.png";

const signupSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  phone: z.string().min(10, "Phone number must be at least 10 characters"),
});

type SignupForm = z.infer<typeof signupSchema>;

export default function Subscription() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [showSignupForm, setShowSignupForm] = useState<string | null>(null);

  const form = useForm<SignupForm>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      email: "",
      password: "", 
      phone: "",
    },
  });

  useEffect(() => {
    // Get plan from URL parameters if coming from splash page
    const urlParams = new URLSearchParams(window.location.search);
    const planParam = urlParams.get('plan');
    if (planParam) {
      setSelectedPlan(planParam);
    }
  }, []);

  const plans = [
    {
      id: "starter",
      name: "starter",
      price: "$19.99/month",
      posts: "12 posts (10 + 2 free)",
      priceId: import.meta.env.VITE_STRIPE_PRICE_ID_STARTER || "price_1234567890starter",
    },
    {
      id: "growth",
      name: "growth",
      price: "$41.99/month", 
      posts: "27 posts (25 + 2 free)",
      priceId: import.meta.env.VITE_STRIPE_PRICE_ID_GROWTH || "price_1234567890growth",
      popular: true,
    },
    {
      id: "professional",
      name: "professional",
      price: "$99.99/month",
      posts: "52 posts (50 + 2 free)",
      priceId: import.meta.env.VITE_STRIPE_PRICE_ID_PROFESSIONAL || "price_1234567890professional",
    },
  ];

  const features = [
    "brand purpose creation",
    "social media scheduling", 
    "automated post creation",
    "automated posting",
    "post analytics",
    "content recommendation",
    "q&a assistant",
    "platform connections",
  ];

  const handleSelectPlan = (planId: string) => {
    setShowSignupForm(planId);
  };

  const handleSignupAndPayment = async (data: SignupForm, priceId: string, planId: string) => {
    try {
      setLoadingPlan(planId);
      
      // First create the user account
      await apiRequest("POST", "/api/auth/signup", data);
      
      // Then create checkout session with the new user
      const response = await apiRequest("POST", "/api/create-checkout-session", {
        priceId,
      });
      
      const checkoutData = await response.json();
      
      if (checkoutData.url) {
        window.location.href = checkoutData.url;
      } else {
        throw new Error("No checkout URL received");
      }
    } catch (error: any) {
      console.error("Signup and payment error:", error);
      toast({
        title: "Process Failed",
        description: error.message || "Failed to create account and process payment",
        variant: "destructive",
      });
    } finally {
      setLoadingPlan(null);
    }
  };

  const onSubmitSignup = (data: SignupForm) => {
    if (!showSignupForm) return;
    
    const plan = plans.find(p => p.id === showSignupForm);
    if (plan) {
      handleSignupAndPayment(data, plan.priceId, plan.id);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-border/40">
        <div className="container-atomiq">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center">
              <Link href="/" className="flex items-center">
                <ArrowLeft className="h-5 w-5 text-muted-foreground mr-3" />
                <img 
                  src="/attached_assets/agency_logo_1749083054761.png" 
                  alt="AiQ" 
                  className="h-12 w-auto"
                />
              </Link>
            </div>
            <div className="flex items-center space-x-6">
              <Link href="/login">
                <Button variant="ghost" className="nav-link">Sign In</Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>
      
      {/* Hero Section */}
      <section className="section-spacing bg-white">
        <div className="container-atomiq text-center">
          <div className="space-y-6 mb-16">
            <div className="inline-flex items-center px-4 py-2 bg-primary/10 rounded-full text-primary text-sm font-medium">
              <Zap className="h-4 w-4 mr-2" />
              Technology Intelligence Plans
            </div>
            <h1 className="text-4xl md:text-5xl font-bold">
              Choose Your <img src={agencyLogoPath} alt="AiQ" className="inline h-12 w-auto mx-2" /> Plan
            </h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Select the perfect plan for your Queensland business. All plans include AI-powered content generation, smart scheduling, and platform connections.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {plans.map((plan, index) => (
              <div 
                key={plan.id} 
                className={`pricing-card p-6 ${
                  plan.popular ? 'pricing-card-popular' : ''
                }`}
              >
                {plan.popular && (
                  <div className="absolute top-0 left-1/2 transform -translate-x-1/2 bg-gradient-atomiq text-white px-4 py-1 rounded-b-lg text-sm font-medium">
                    Most Popular
                  </div>
                )}
                
                <div className={`space-y-6 ${plan.popular ? 'pt-4' : ''}`}>
                  <div className="space-y-2">
                    <h3 className="text-2xl font-bold capitalize">{plan.name}</h3>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-primary">{plan.price.split('/')[0]}</div>
                      <div className="text-sm text-muted-foreground">/month</div>
                    </div>
                    <p className="text-muted-foreground">{plan.posts}</p>
                  </div>
                  
                  <div className="space-y-4">
                    {features.map((feature, featureIndex) => (
                      <div key={featureIndex} className="flex items-center space-x-3">
                        <div className="w-5 h-5 bg-gradient-atomiq rounded-full flex items-center justify-center flex-shrink-0">
                          <CheckIcon className="w-3 h-3 text-white" />
                        </div>
                        <span className="text-sm text-left capitalize">{feature}</span>
                      </div>
                    ))}
                  </div>

                  {showSignupForm === plan.id ? (
                    <div className="space-y-4 mt-6">
                      <form onSubmit={form.handleSubmit(onSubmitSignup)} className="space-y-4">
                        <div>
                          <Label htmlFor={`email-${plan.id}`} className="text-sm font-medium text-gray-700">Email</Label>
                          <Input
                            id={`email-${plan.id}`}
                            type="email"
                            {...form.register('email')}
                            className="mt-1"
                            placeholder="your@email.com"
                          />
                          {form.formState.errors.email && (
                            <p className="text-sm text-red-600 mt-1">{form.formState.errors.email.message}</p>
                          )}
                        </div>
                        
                        <div>
                          <Label htmlFor={`password-${plan.id}`} className="text-sm font-medium text-gray-700">Password</Label>
                          <Input
                            id={`password-${plan.id}`}
                            type="password"
                            {...form.register('password')}
                            className="mt-1"
                            placeholder="••••••••"
                          />
                          {form.formState.errors.password && (
                            <p className="text-sm text-red-600 mt-1">{form.formState.errors.password.message}</p>
                          )}
                        </div>
                        
                        <div>
                          <Label htmlFor={`phone-${plan.id}`} className="text-sm font-medium text-gray-700">Phone</Label>
                          <Input
                            id={`phone-${plan.id}`}
                            type="tel"
                            {...form.register('phone')}
                            className="mt-1"
                            placeholder="+15005550006"
                          />
                          {form.formState.errors.phone && (
                            <p className="text-sm text-red-600 mt-1">{form.formState.errors.phone.message}</p>
                          )}
                        </div>
                        
                        <Button 
                          type="submit"
                          className={`w-full text-lg py-6 ${
                            plan.popular 
                              ? 'btn-atomiq-primary'
                              : 'btn-atomiq-secondary'
                          } ${
                            loadingPlan === plan.id ? 'opacity-50 cursor-not-allowed' : ''
                          }`}
                          disabled={loadingPlan === plan.id}
                        >
                          {loadingPlan === plan.id ? (
                            <div className="flex items-center space-x-2">
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                              <span>Creating Account...</span>
                            </div>
                          ) : (
                            `Sign Up & Pay ${plan.price}`
                          )}
                        </Button>
                      </form>
                      
                      <Button 
                        variant="outline"
                        className="w-full"
                        onClick={() => setShowSignupForm(null)}
                      >
                        Back to Plans
                      </Button>
                    </div>
                  ) : (
                    <Button 
                      className={`w-full text-lg py-6 ${
                        plan.popular 
                          ? 'btn-atomiq-primary'
                          : 'btn-atomiq-secondary'
                      }`}
                      onClick={() => handleSelectPlan(plan.id)}
                    >
                      Select {plan.name}
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-16 space-y-8">
            <div className="grid md:grid-cols-3 gap-8 text-center">
              <div className="space-y-2">
                <div className="w-12 h-12 bg-gradient-atomiq rounded-xl flex items-center justify-center mx-auto">
                  <CheckIcon className="h-6 w-6 text-white" />
                </div>
                <h4 className="font-semibold">No Setup Fees</h4>
                <p className="text-sm text-muted-foreground">Start immediately with no hidden costs</p>
              </div>
              <div className="space-y-2">
                <div className="w-12 h-12 bg-gradient-atomiq rounded-xl flex items-center justify-center mx-auto">
                  <Star className="h-6 w-6 text-white" />
                </div>
                <h4 className="font-semibold">Cancel Anytime</h4>
                <p className="text-sm text-muted-foreground">Flexible subscription with no long-term commitment</p>
              </div>
              <div className="space-y-2">
                <div className="w-12 h-12 bg-gradient-atomiq rounded-xl flex items-center justify-center mx-auto">
                  <Zap className="h-6 w-6 text-white" />
                </div>
                <h4 className="font-semibold">AI-Powered</h4>
                <p className="text-sm text-muted-foreground">Advanced technology for intelligent automation</p>
              </div>
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
                <img 
                  src="/attached_assets/agency_logo_1749083054761.png" 
                  alt="AiQ" 
                  className="h-10 w-auto"
                />
              </div>
              <p className="text-muted-foreground leading-relaxed">
                Smarter social media automation for Queensland businesses. Technology and intelligence working together.
              </p>
            </div>
            
            <div className="space-y-4">
              <h5 className="font-semibold">Product</h5>
              <div className="space-y-2">
                <Link href="/subscription" className="nav-link block">Pricing</Link>
                <Link href="/#features" className="nav-link block">Features</Link>
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
          
          <div className="border-t border-border mt-12 pt-8 text-center space-y-4">
            <div className="flex flex-col sm:flex-row justify-center items-center gap-4 text-sm text-muted-foreground">
              <a href="https://app.theagencyiq.ai/terms" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">
                Terms of Service
              </a>
              <span className="hidden sm:block">•</span>
              <a href="https://app.theagencyiq.ai/privacy" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">
                Privacy Policy
              </a>
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
