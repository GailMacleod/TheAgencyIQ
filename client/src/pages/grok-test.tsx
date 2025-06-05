import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle } from "lucide-react";
import { apiRequest } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import Header from "@/components/header";

export default function GrokTest() {
  const { toast } = useToast();
  const [showGrokThinking, setShowGrokThinking] = useState(false);
  const [grokStep, setGrokStep] = useState(0);
  const [generatedPosts, setGeneratedPosts] = useState<any[]>([]);

  const grokThinkingSteps = [
    {
      step: 1,
      title: "Analyzing Brand Purpose & Goals",
      content: "Reviewing your Strategyzer-based brand purpose to understand core messaging, target audience, and business objectives...",
      duration: 2000
    },
    {
      step: 2, 
      title: "Platform Strategy Analysis",
      content: "Evaluating which social media platforms best align with your goals: LinkedIn for B2B reach, Instagram for visual storytelling, Facebook for community building...",
      duration: 3000
    },
    {
      step: 3,
      title: "Queensland Event Integration", 
      content: "Cross-referencing local Queensland events, school holidays, and seasonal opportunities to optimize posting timing...",
      duration: 2500
    },
    {
      step: 4,
      title: "Content Creation & Refinement",
      content: "Generating platform-specific content that reflects your brand voice while maximizing engagement potential...",
      duration: 4000
    },
    {
      step: 5,
      title: "Final Review & Optimization",
      content: "Applying unpaid media best practices and ensuring each post meets your strategic objectives...",
      duration: 2000
    }
  ];

  const generateContentWithGrokThinking = async () => {
    setShowGrokThinking(true);
    setGrokStep(0);
    
    try {
      // Simulate Grok's thinking process
      for (let i = 0; i < grokThinkingSteps.length; i++) {
        setGrokStep(i + 1);
        await new Promise(resolve => setTimeout(resolve, grokThinkingSteps[i].duration));
      }
      
      // Generate real content using Grok API
      const response = await apiRequest("POST", "/api/grok/generate-content", {});
      const data = await response.json();
      const grokPosts = data.posts.map((post: any, index: number) => ({
        id: index + 1,
        platform: post.platform,
        content: post.content,
        status: "scheduled",
        scheduledFor: post.scheduledFor,
        grokRecommendation: `Grok generated this ${post.platform} post based on your brand purpose analysis`
      }));
      
      setGeneratedPosts(grokPosts);
    } catch (error: any) {
      toast({
        title: "Content Generation Failed",
        description: error.message || "Unable to generate content with Grok",
        variant: "destructive",
      });
    } finally {
      setShowGrokThinking(false);
    }
  };

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case "linkedin":
        return <div className="w-8 h-8 bg-blue-600 rounded text-white flex items-center justify-center text-sm font-bold">Li</div>;
      case "instagram":
        return <div className="w-8 h-8 bg-pink-600 rounded text-white flex items-center justify-center text-sm font-bold">Ig</div>;
      case "facebook":
        return <div className="w-8 h-8 bg-blue-700 rounded text-white flex items-center justify-center text-sm font-bold">Fb</div>;
      default:
        return <div className="w-8 h-8 bg-gray-600 rounded text-white flex items-center justify-center text-sm font-bold">?</div>;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header showBack="/" title="Grok Content Generation Test" />
      
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-light text-gray-900 lowercase mb-4">
            grok content generation workflow
          </h1>
          <p className="text-gray-600 text-sm lowercase">
            watch grok analyze your brand purpose and create strategic social media content
          </p>
          
          <Button
            onClick={generateContentWithGrokThinking}
            className="mt-6 bg-purple-600 hover:bg-purple-700 text-white lowercase px-8 py-3"
            disabled={showGrokThinking}
          >
            {showGrokThinking ? 'grok is thinking...' : 'generate content with grok'}
          </Button>
        </div>

        {/* Grok Thinking Process Modal */}
        {showGrokThinking && (
          <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
            <Card className="max-w-2xl w-full bg-white">
              <CardContent className="p-8">
                <div className="text-center">
                  <h2 className="text-2xl font-light text-purple-700 mb-6 lowercase">
                    grok's strategic analysis
                  </h2>
                  
                  {/* Progress Steps */}
                  <div className="space-y-6">
                    {grokThinkingSteps.map((step, index) => (
                      <div 
                        key={index}
                        className={`flex items-start space-x-4 p-4 rounded-lg transition-all duration-500 border ${
                          grokStep > index ? 'bg-green-50 border-green-200' :
                          grokStep === index + 1 ? 'bg-purple-50 border-purple-200 shadow-md' :
                          'bg-gray-50 border-gray-200'
                        }`}
                      >
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                          grokStep > index ? 'bg-green-500 text-white' :
                          grokStep === index + 1 ? 'bg-purple-500 text-white animate-pulse' :
                          'bg-gray-300 text-gray-600'
                        }`}>
                          {grokStep > index ? '✓' : step.step}
                        </div>
                        <div className="flex-1 text-left">
                          <h3 className="font-medium text-gray-900 lowercase">{step.title}</h3>
                          <p className="text-sm text-gray-600 mt-1">{step.content}</p>
                        </div>
                        {grokStep === index + 1 && (
                          <div className="animate-spin w-4 h-4 border-2 border-purple-600 border-t-transparent rounded-full"></div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Generated Posts Preview */}
        {generatedPosts.length > 0 && (
          <div className="mt-8">
            <h2 className="text-xl font-light text-gray-900 mb-4 lowercase">
              grok's content recommendations
            </h2>
            <div className="grid gap-6">
              {generatedPosts.map((post) => (
                <Card key={post.id} className="p-6">
                  <CardContent className="p-0">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        {getPlatformIcon(post.platform)}
                        <div>
                          <h3 className="font-medium text-gray-900 lowercase">{post.platform}</h3>
                          <p className="text-sm text-gray-500">
                            scheduled for {format(new Date(post.scheduledFor), 'MMM d, h:mm a')}
                          </p>
                        </div>
                      </div>
                      <Badge variant="outline" className="lowercase">
                        {post.status}
                      </Badge>
                    </div>
                    
                    <div className="mb-4">
                      <p className="text-gray-800 whitespace-pre-wrap">{post.content}</p>
                    </div>
                    
                    {post.grokRecommendation && (
                      <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 mb-4">
                        <p className="text-purple-700 text-sm font-medium lowercase">grok's strategy:</p>
                        <p className="text-purple-800 text-sm">{post.grokRecommendation}</p>
                      </div>
                    )}
                    
                    <div className="flex space-x-3">
                      <Button
                        className="bg-green-600 hover:bg-green-700 text-white lowercase"
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        approve & schedule
                      </Button>
                      <Button
                        variant="outline"
                        className="lowercase"
                      >
                        edit post
                      </Button>
                      <Button
                        variant="outline"
                        className="text-red-600 border-red-200 hover:bg-red-50 lowercase"
                      >
                        reject
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}