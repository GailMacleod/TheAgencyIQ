import React from 'react';
import { VideoGenerationPanel } from '@/components/video/VideoGenerationPanel';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Video, Sparkles, Globe, Users } from 'lucide-react';

export function VideoGeneration() {
  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="space-y-6">
        {/* Header */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Video className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold">VEO 2.0 Video Generation</h1>
              <p className="text-muted-foreground">
                Create cinematic videos for Queensland small businesses using Google's VEO AI
              </p>
            </div>
          </div>

          {/* Feature Highlights */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="h-5 w-5 text-yellow-500" />
                  <h3 className="font-semibold">JTBD Framework</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  Videos crafted using Jobs-to-be-Done methodology for authentic customer connection
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Globe className="h-5 w-5 text-blue-500" />
                  <h3 className="font-semibold">Queensland Focus</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  Localized content reflecting Australian business culture and Queensland charm
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="h-5 w-5 text-green-500" />
                  <h3 className="font-semibold">Brand Integration</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  Seamlessly incorporates your brand purpose and business context
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Status Indicators */}
          <div className="flex flex-wrap gap-2">
            <Badge variant="default" className="bg-green-500">
              <Video className="h-3 w-3 mr-1" />
              VEO 2.0 Ready
            </Badge>
            <Badge variant="outline">
              <Sparkles className="h-3 w-3 mr-1" />
              JTBD Enhanced
            </Badge>
            <Badge variant="outline">
              4K Cinematic Quality
            </Badge>
            <Badge variant="outline">
              30-60 Second Duration
            </Badge>
          </div>
        </div>

        {/* Main Video Generation Panel */}
        <VideoGenerationPanel />

        {/* How It Works */}
        <Card>
          <CardHeader>
            <CardTitle>How VEO 2.0 Video Generation Works</CardTitle>
            <CardDescription>
              Understanding the process behind your cinematic business videos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <div className="bg-primary/10 rounded-full w-8 h-8 flex items-center justify-center">
                  <span className="text-sm font-bold text-primary">1</span>
                </div>
                <h4 className="font-semibold">Prompt Enhancement</h4>
                <p className="text-sm text-muted-foreground">
                  Your prompt is enhanced with JTBD framework and Queensland business context
                </p>
              </div>

              <div className="space-y-2">
                <div className="bg-primary/10 rounded-full w-8 h-8 flex items-center justify-center">
                  <span className="text-sm font-bold text-primary">2</span>
                </div>
                <h4 className="font-semibold">VEO Processing</h4>
                <p className="text-sm text-muted-foreground">
                  Google's VEO AI generates your cinematic video with professional quality
                </p>
              </div>

              <div className="space-y-2">
                <div className="bg-primary/10 rounded-full w-8 h-8 flex items-center justify-center">
                  <span className="text-sm font-bold text-primary">3</span>
                </div>
                <h4 className="font-semibold">Brand Integration</h4>
                <p className="text-sm text-muted-foreground">
                  Your brand purpose and business details are woven into the narrative
                </p>
              </div>

              <div className="space-y-2">
                <div className="bg-primary/10 rounded-full w-8 h-8 flex items-center justify-center">
                  <span className="text-sm font-bold text-primary">4</span>
                </div>
                <h4 className="font-semibold">Ready to Use</h4>
                <p className="text-sm text-muted-foreground">
                  Download your professional video ready for social media and marketing
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tips for Better Videos */}
        <Card>
          <CardHeader>
            <CardTitle>Tips for Better Video Results</CardTitle>
            <CardDescription>
              Get the most out of your VEO video generation
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <h4 className="font-semibold text-green-600">Do Include:</h4>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  <li>• Specific actions and emotions</li>
                  <li>• Clear business context</li>
                  <li>• Target customer personas</li>
                  <li>• Queensland location references</li>
                  <li>• Professional yet approachable tone</li>
                </ul>
              </div>

              <div className="space-y-3">
                <h4 className="font-semibold text-red-600">Avoid:</h4>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  <li>• Overly generic descriptions</li>
                  <li>• Complex storylines</li>
                  <li>• Too many characters or scenes</li>
                  <li>• Unrealistic scenarios</li>
                  <li>• Competitor brand references</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default VideoGeneration;