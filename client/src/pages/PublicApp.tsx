import { useState, useEffect } from "react";
import { Switch, Route, Link, useLocation } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "../lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Home, 
  Users, 
  BarChart3, 
  Calendar, 
  Settings, 
  Video,
  Zap,
  Globe,
  MessageSquare,
  TrendingUp
} from "lucide-react";

import ConnectPlatforms from "./connect-platforms";
import VideoGeneration from "./VideoGeneration";
import Analytics from "./analytics";
import AIDashboard from "./ai-dashboard";
import BrandPurpose from "./brand-purpose";
import IntelligentSchedule from "./intelligent-schedule";

// Public App component that bypasses authentication
export default function PublicApp() {
  const [location, setLocation] = useLocation();
  const [demoMode, setDemoMode] = useState(true);

  useEffect(() => {
    // Set demo mode for public access
    localStorage.setItem('demo-mode', 'true');
    localStorage.setItem('public-access', 'true');
  }, []);

  const navigation = [
    { path: "/public", label: "Dashboard", icon: Home },
    { path: "/public/platforms", label: "Connect Platforms", icon: Users },
    { path: "/public/video", label: "VEO Video Generation", icon: Video },
    { path: "/public/ai-dashboard", label: "AI Dashboard", icon: Zap },
    { path: "/public/analytics", label: "Analytics", icon: BarChart3 },
    { path: "/public/schedule", label: "Smart Schedule", icon: Calendar },
    { path: "/public/brand", label: "Brand Purpose", icon: Settings },
  ];

  const PublicDashboard = () => (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
                TheAgencyIQ
              </h1>
              <p className="text-lg text-gray-600 dark:text-gray-300">
                AI-Powered Social Media Automation for Queensland SMEs
              </p>
            </div>
            <Badge variant="secondary" className="px-4 py-2">
              Demo Mode - Full Access
            </Badge>
          </div>
        </div>

        {/* VEO 2.0 Feature Highlight */}
        <Card className="mb-8 bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0">
          <CardHeader>
            <CardTitle className="text-2xl flex items-center gap-2">
              <Video className="h-8 w-8" />
              VEO 2.0 Video Generation Now Available!
            </CardTitle>
            <CardDescription className="text-purple-100">
              Create cinematic videos with AI using the Jobs-to-be-Done framework for Queensland businesses
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <Link href="/public/video">
                <Button variant="secondary" size="lg">
                  Try VEO Video Generation
                </Button>
              </Link>
              <Link href="/public/ai-dashboard">
                <Button variant="outline" size="lg" className="text-white border-white hover:bg-white hover:text-purple-600">
                  View AI Dashboard
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-600" />
                5-Platform Integration
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                Connect Facebook, Instagram, LinkedIn, X (Twitter), and YouTube
              </p>
              <Link href="/public/platforms">
                <Button variant="outline" size="sm">Connect Platforms</Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Video className="h-5 w-5 text-purple-600" />
                VEO 2.0 Videos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                AI-generated cinematic videos with Queensland business context
              </p>
              <Link href="/public/video">
                <Button variant="outline" size="sm">Generate Videos</Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-yellow-600" />
                AI Content Generation
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                Smart content creation with JTBD framework integration
              </p>
              <Link href="/public/ai-dashboard">
                <Button variant="outline" size="sm">View AI Dashboard</Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-green-600" />
                Advanced Analytics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                Comprehensive performance tracking and insights
              </p>
              <Link href="/public/analytics">
                <Button variant="outline" size="sm">View Analytics</Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-blue-600" />
                Smart Scheduling
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                Intelligent posting schedule optimization
              </p>
              <Link href="/public/schedule">
                <Button variant="outline" size="sm">Smart Schedule</Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5 text-indigo-600" />
                Queensland Focus
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                Tailored for Queensland small business culture and market
              </p>
              <Link href="/public/brand">
                <Button variant="outline" size="sm">Brand Purpose</Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* System Status */}
        <Card>
          <CardHeader>
            <CardTitle>System Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="w-3 h-3 bg-green-500 rounded-full mx-auto mb-2"></div>
                <p className="text-sm text-gray-600 dark:text-gray-300">OAuth System</p>
                <p className="text-xs text-green-600">75% Success Rate</p>
              </div>
              <div className="text-center">
                <div className="w-3 h-3 bg-green-500 rounded-full mx-auto mb-2"></div>
                <p className="text-sm text-gray-600 dark:text-gray-300">VEO 2.0</p>
                <p className="text-xs text-green-600">Ready</p>
              </div>
              <div className="text-center">
                <div className="w-3 h-3 bg-green-500 rounded-full mx-auto mb-2"></div>
                <p className="text-sm text-gray-600 dark:text-gray-300">JTBD Framework</p>
                <p className="text-xs text-green-600">Operational</p>
              </div>
              <div className="text-center">
                <div className="w-3 h-3 bg-green-500 rounded-full mx-auto mb-2"></div>
                <p className="text-sm text-gray-600 dark:text-gray-300">Analytics</p>
                <p className="text-xs text-green-600">Live</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        {/* Navigation */}
        <nav className="bg-white dark:bg-gray-800 shadow-sm border-b">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center space-x-8">
                <Link href="/public">
                  <span className="text-xl font-bold text-gray-900 dark:text-white">
                    TheAgencyIQ
                  </span>
                </Link>
                <div className="hidden md:flex space-x-4">
                  {navigation.map((item) => {
                    const Icon = item.icon;
                    const isActive = location === item.path;
                    return (
                      <Link
                        key={item.path}
                        href={item.path}
                        className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                          isActive
                            ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
                            : "text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                        <span>{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
              <Badge variant="outline">Demo Mode</Badge>
            </div>
          </div>
        </nav>

        {/* Main Content */}
        <main className="flex-1">
          <Switch>
            <Route path="/public" component={PublicDashboard} />
            <Route path="/public/platforms" component={ConnectPlatforms} />
            <Route path="/public/video" component={VideoGeneration} />
            <Route path="/public/ai-dashboard" component={AIDashboard} />
            <Route path="/public/analytics" component={Analytics} />
            <Route path="/public/schedule" component={IntelligentSchedule} />
            <Route path="/public/brand" component={BrandPurpose} />
            <Route component={PublicDashboard} />
          </Switch>
        </main>

        <Toaster />
      </div>
    </QueryClientProvider>
  );
}