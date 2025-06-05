import { useState } from "react";
import { useLocation } from "wouter";
import Header from "@/components/header";
import Footer from "@/components/footer";
import GrokWidget from "@/components/grok-widget";
import { Card, CardContent } from "@/components/ui/card";
import { CheckIcon } from "lucide-react";
import { apiRequest } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

export default function Subscription() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  const plans = [
    {
      id: "starter",
      name: "starter",
      price: "a$19.99/month",
      posts: "12 posts (10 + 2 free)",
      priceId: process.env.STRIPE_PRICE_ID_STARTER || "STRIPE_PRICE_ID_STARTER",
    },
    {
      id: "growth",
      name: "growth",
      price: "a$41.99/month", 
      posts: "27 posts (25 + 2 free)",
      priceId: process.env.STRIPE_PRICE_ID_GROWTH || "STRIPE_PRICE_ID_GROWTH",
      popular: true,
    },
    {
      id: "professional",
      name: "professional",
      price: "a$99.99/month",
      posts: "52 posts (50 + 2 free)",
      priceId: process.env.STRIPE_PRICE_ID_PROFESSIONAL || "STRIPE_PRICE_ID_PROFESSIONAL",
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

  const handlePayment = async (priceId: string, planId: string) => {
    try {
      setLoadingPlan(planId);
      
      const response = await apiRequest("POST", "/api/create-checkout-session", {
        priceId,
      });
      
      const data = await response.json();
      
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error("No checkout URL received");
      }
    } catch (error: any) {
      console.error("Payment error:", error);
      toast({
        title: "Payment Failed",
        description: "payment failed, please try again",
        variant: "destructive",
      });
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header showBack="/"/>
      
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <h1 className="text-heading font-light text-foreground lowercase">choose your plan</h1>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {plans.map((plan) => (
            <Card 
              key={plan.id} 
              className={`card-agencyiq text-center relative ${
                plan.popular ? 'border-2 border-primary' : ''
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-primary text-white px-4 py-1 rounded-full text-sm lowercase">
                  most popular
                </div>
              )}
              
              <CardContent className="p-8">
                <h3 className="text-xl font-medium text-foreground mb-2 lowercase">{plan.name}</h3>
                <div className="text-2xl font-semibold text-primary mb-4 lowercase">{plan.price}</div>
                <div className="text-foreground mb-6 lowercase">{plan.posts}</div>
                
                <div className="space-items mb-8">
                  {features.map((feature, index) => (
                    <div key={index} className="flex items-center space-x-3">
                      <div className="w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                        <CheckIcon className="w-3 h-3 text-white" />
                      </div>
                      <span className="text-sm text-foreground lowercase">{feature}</span>
                    </div>
                  ))}
                </div>

                <button 
                  className={`w-full font-medium transition-all duration-200 px-6 py-3 rounded lowercase ${
                    plan.popular 
                      ? 'bg-primary text-white hover:bg-[hsl(var(--atomic-cyan))]'
                      : 'btn-primary'
                  } ${
                    loadingPlan === plan.id ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                  onClick={() => handlePayment(plan.priceId, plan.id)}
                  disabled={loadingPlan === plan.id}
                >
                  {loadingPlan === plan.id ? 'processing...' : 'subscribe now'}
                </button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <Footer />
      <GrokWidget />
    </div>
  );
}
