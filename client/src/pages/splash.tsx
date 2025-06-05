import { Link } from "wouter";
import Header from "@/components/header";
import Footer from "@/components/footer";
import GrokWidget from "@/components/grok-widget";
import { CheckIcon } from "lucide-react";

export default function Splash() {
  const benefits = [
    "saves time: everything automated",
    "improves results: brand-aligned content", 
    "affordable: plans for all budgets",
    "peace of mind: secure and compliant"
  ];

  return (
    <div className="min-h-screen bg-white">
      <Header showLogin />
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center">
          <h1 className="text-large-heading font-light text-foreground mb-12 lowercase">
            the agencyiq - social media automation for queensland businesses
          </h1>
          
          <div className="grid md:grid-cols-2 gap-8 mb-16 space-sections">
            {benefits.map((benefit, index) => (
              <div key={index} className="flex items-center justify-center space-x-3">
                <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                  <CheckIcon className="w-4 h-4 text-white" />
                </div>
                <span className="text-lg text-foreground lowercase">{benefit}</span>
              </div>
            ))}
          </div>

          <Link href="/subscription">
            <button className="btn-primary text-lg">
              get started
            </button>
          </Link>
        </div>
      </div>

      <Footer />
      <GrokWidget />
    </div>
  );
}
