import { useLocation } from "wouter";
import { Target, Users, Calendar, Send, BarChart3, Settings } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

interface NavItem {
  id: string;
  label: string;
  icon: React.ElementType;
  route: string;
  description: string;
  requiresSubscription: boolean;
  requiresBrandPurpose?: boolean;
  requiresPlatformConnection?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  {
    id: "brand-purpose",
    label: "Brand Purpose",
    icon: Target,
    route: "/brand-purpose",
    description: "Define your brand",
    requiresSubscription: false, // Brand purpose is accessible for onboarding
  },
  {
    id: "schedule",
    label: "Social Schedule",
    icon: Calendar,
    route: "/schedule",
    description: "Auto Schedule Posts",
    requiresSubscription: true,
    requiresBrandPurpose: true,
  },
  {
    id: "platform-connect",
    label: "Platform Connect",
    icon: Users,
    route: "/platform-connections",
    description: "Connect Accounts",
    requiresSubscription: true,
  },
  {
    id: "publish",
    label: "Publish",
    icon: Send,
    route: "/schedule", // Same as schedule but focused on publishing
    description: "Publish Posts",
    requiresSubscription: true,
    requiresBrandPurpose: true,
    requiresPlatformConnection: true,
  },
  {
    id: "analytics",
    label: "Analytics",
    icon: BarChart3,
    route: "/analytics",
    description: "Track Performance",
    requiresSubscription: true,
  }
];

export default function HorizontalNavigation() {
  const [location, setLocation] = useLocation();
  
  // Fetch user data to check subscription status
  const { data: user } = useQuery({
    queryKey: ["/api/user"],
    staleTime: 5 * 60 * 1000,
  });

  // Fetch brand purpose to check completion
  const { data: brandPurpose } = useQuery({
    queryKey: ["/api/brand-purpose"],
    enabled: !!user,
  });

  // Fetch platform connections to check status
  const { data: platformConnections } = useQuery({
    queryKey: ["/api/platform-connections"],
    enabled: !!user,
  });

  // Check if user has active subscription
  const hasActiveSubscription = user?.subscriptionPlan && 
    user.subscriptionPlan !== '' && 
    user.subscriptionPlan !== 'none';

  // Check if brand purpose is completed
  const brandPurposeCompleted = brandPurpose && (brandPurpose as any).businessName;

  // Check if platforms are connected
  const platformsConnected = platformConnections && Array.isArray(platformConnections) && platformConnections.length > 0;

  // Determine which step user should focus on next
  const getNextStep = (): string => {
    if (!hasActiveSubscription) return "subscription";
    if (!brandPurposeCompleted) return "brand-purpose";
    if (!platformsConnected) return "platform-connect";
    return "schedule";
  };

  const nextStep = getNextStep();

  // Handle navigation clicks with subscription wall enforcement
  const handleNavClick = (item: NavItem) => {
    // Always allow brand purpose access for onboarding
    if (item.id === "brand-purpose") {
      setLocation(item.route);
      return;
    }

    // Enforce subscription wall for all other features
    if (item.requiresSubscription && !hasActiveSubscription) {
      setLocation("/subscription");
      return;
    }

    // Check additional requirements
    if (item.requiresBrandPurpose && !brandPurposeCompleted) {
      setLocation("/brand-purpose");
      return;
    }

    if (item.requiresPlatformConnection && !platformsConnected) {
      setLocation("/platform-connections");
      return;
    }

    // All checks passed, navigate to the route
    setLocation(item.route);
  };

  // Determine icon state and styling
  const getIconState = (item: NavItem) => {
    // If this is the next step, make it throb
    if (item.id === nextStep) {
      return "next";
    }

    // If requirements not met, show disabled
    if (item.requiresSubscription && !hasActiveSubscription) {
      return "disabled";
    }

    if (item.requiresBrandPurpose && !brandPurposeCompleted) {
      return "disabled";
    }

    if (item.requiresPlatformConnection && !platformsConnected) {
      return "disabled";
    }

    // Otherwise, show as available
    return "available";
  };

  return (
    <section className="py-8 sm:py-16 bg-white">
      <div className="container-atomiq">
        <div className="text-center space-y-2 sm:space-y-4 mb-8 sm:mb-12 px-4 sm:px-0">
          <h3 className="text-2xl sm:text-4xl md:text-5xl font-bold text-[#3b5cff]">
            Your Workflow
          </h3>
          <p className="text-base sm:text-xl text-muted-foreground max-w-3xl mx-auto">
            AI-powered social media automation in simple steps
          </p>
        </div>

        {/* Horizontal Navigation Bar */}
        <div className="flex flex-wrap justify-center items-center gap-4 md:gap-8 max-w-4xl mx-auto">
          {NAV_ITEMS.map((item, index) => {
            const IconComponent = item.icon;
            const iconState = getIconState(item);
            
            return (
              <div key={item.id} className="flex items-center">
                {/* Navigation Item - Compact Design */}
                <button
                  onClick={() => handleNavClick(item)}
                  className={cn(
                    "group flex flex-col items-center p-3 rounded-lg transition-all duration-300 hover:scale-105",
                    "bg-white border text-center min-w-[80px]",
                    iconState === "next" && "border-[#00f0ff] shadow-md animate-slow-pulse",
                    iconState === "completed" && "border-[#3250fa]",
                    iconState === "available" && "border-gray-300 hover:border-gray-400",
                    iconState === "disabled" && "border-gray-200 opacity-60 cursor-not-allowed"
                  )}
                  disabled={iconState === "disabled"}
                >
                  {/* Icon */}
                  <div className="flex justify-center mb-2">
                    <IconComponent className={cn(
                      "w-6 h-6 transition-colors",
                      iconState === "next" && "text-[#00f0ff]",
                      iconState === "completed" && "text-[#3250fa]",
                      iconState === "available" && "text-gray-500",
                      iconState === "disabled" && "text-gray-400"
                    )} />
                  </div>
                  
                  {/* Label Only */}
                  <span className={cn(
                    "text-xs font-medium",
                    iconState === "next" && "text-[#00f0ff]",
                    iconState === "completed" && "text-[#3250fa]",
                    iconState === "available" && "text-gray-500",
                    iconState === "disabled" && "text-gray-400"
                  )}>
                    {item.label}
                  </span>
                </button>

                {/* Arrow between items (except last) */}
                {index < NAV_ITEMS.length - 1 && (
                  <div className="hidden md:block mx-2">
                    <svg 
                      className="w-4 h-4 text-gray-300" 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                        strokeWidth={2} 
                        d="M9 5l7 7-7 7" 
                      />
                    </svg>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Progress Indicator */}
        <div className="mt-8 text-center">
          <div className="inline-flex items-center space-x-2 px-4 py-2 bg-gray-100 rounded-full">
            <div className={cn(
              "w-2 h-2 rounded-full",
              hasActiveSubscription ? "bg-green-500" : "bg-gray-300"
            )} />
            <span className="text-sm text-gray-600">
              {hasActiveSubscription ? "Subscribed" : "Subscribe to continue"}
            </span>
            
            {hasActiveSubscription && (
              <>
                <div className="w-1 h-1 bg-gray-400 rounded-full" />
                <div className={cn(
                  "w-2 h-2 rounded-full",
                  brandPurposeCompleted ? "bg-green-500" : "bg-gray-300"
                )} />
                <span className="text-sm text-gray-600">
                  {brandPurposeCompleted ? "Brand Defined" : "Define Brand"}
                </span>
                
                <div className="w-1 h-1 bg-gray-400 rounded-full" />
                <div className={cn(
                  "w-2 h-2 rounded-full",
                  platformsConnected ? "bg-green-500" : "bg-gray-300"
                )} />
                <span className="text-sm text-gray-600">
                  {platformsConnected ? "Platforms Connected" : "Connect Platforms"}
                </span>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}