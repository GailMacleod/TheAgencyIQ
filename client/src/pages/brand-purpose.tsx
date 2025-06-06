import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { apiRequest } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import MasterHeader from "@/components/master-header";
import MasterFooter from "@/components/master-footer";
import BackButton from "@/components/back-button";
import { Bot, Lightbulb } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const brandPurposeSchema = z.object({
  brandName: z.string().min(1, "Brand name is required"),
  productsServices: z.string().min(10, "Products/services description must be at least 10 characters"),
  corePurpose: z.string().min(10, "Core purpose must be at least 10 characters"),
  audience: z.string().min(10, "Ideal audience must be at least 10 characters"),
  jobToBeDone: z.string().min(10, "Job to be done must be at least 10 characters"),
  motivations: z.string().min(10, "Audience motivations must be at least 10 characters"),
  painPoints: z.string().min(10, "Pain points must be at least 10 characters"),
  goals: z.object({
    driveTraffic: z.boolean().default(false),
    websiteUrl: z.string().optional(),
    trafficTarget: z.string().optional(),
    buildBrand: z.boolean().default(false),
    followerTarget: z.string().optional(),
    reachTarget: z.string().optional(),
    makeSales: z.boolean().default(false),
    salesUrl: z.string().optional(),
    salesTarget: z.string().optional(),
    conversionTarget: z.string().optional(),
    generateLeads: z.boolean().default(false),
    leadTarget: z.string().optional(),
    engagementTarget: z.string().optional(),
    informEducate: z.boolean().default(false),
    keyMessage: z.string().optional(),
    educationTarget: z.string().optional(),
  }),
  contactDetails: z.object({
    email: z.string().email("Invalid email").optional().or(z.literal("")),
    phone: z.string().optional(),
  }),
});

type BrandPurposeForm = z.infer<typeof brandPurposeSchema>;

export default function BrandPurpose() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [isExistingData, setIsExistingData] = useState(false);
  const [guidance, setGuidance] = useState<string>("");
  const [showGuidance, setShowGuidance] = useState(false);
  const [isGeneratingGuidance, setIsGeneratingGuidance] = useState(false);

  // Load existing brand purpose data
  const { data: existingBrandPurpose, isLoading: isLoadingBrandPurpose } = useQuery({
    queryKey: ["/api/brand-purpose"],
    retry: false,
    staleTime: 0,
  });

  const form = useForm<BrandPurposeForm>({
    resolver: zodResolver(brandPurposeSchema),
    defaultValues: {
      brandName: "",
      productsServices: "",
      corePurpose: "",
      audience: "",
      jobToBeDone: "",
      motivations: "",
      painPoints: "",
      goals: {
        driveTraffic: false,
        websiteUrl: "",
        trafficTarget: "",
        buildBrand: false,
        followerTarget: "",
        reachTarget: "",
        makeSales: false,
        salesUrl: "",
        salesTarget: "",
        conversionTarget: "",
        generateLeads: false,
        leadTarget: "",
        engagementTarget: "",
        informEducate: false,
        keyMessage: "",
        educationTarget: "",
      },
      contactDetails: {
        email: "",
        phone: "",
      },
    },
  });

  // Load existing data into form when available
  useEffect(() => {
    if (existingBrandPurpose && typeof existingBrandPurpose === 'object') {
      setIsExistingData(true);
      // Don't auto-populate fields to show placeholder text
    }
  }, [existingBrandPurpose, form]);

  // Watch form values to trigger guidance after first three questions
  const watchedValues = form.watch();

  // Generate real-time guidance based on AgencyIQ prompts
  const generateGuidance = async (formData: Partial<BrandPurposeForm>) => {
    setIsGeneratingGuidance(true);
    try {
      const response = await apiRequest("POST", "/api/generate-guidance", {
        brandName: formData.brandName,
        productsServices: formData.productsServices,
        corePurpose: formData.corePurpose,
        audience: formData.audience,
        jobToBeDone: formData.jobToBeDone,
        motivations: formData.motivations,
        painPoints: formData.painPoints
      });
      
      const result = await response.json();
      setGuidance(result.guidance);
      setShowGuidance(true);
    } catch (error) {
      console.error("Failed to generate guidance:", error);
    } finally {
      setIsGeneratingGuidance(false);
    }
  };

  // Auto-save progress when first three fields are filled
  const autoSaveProgress = async (formData: Partial<BrandPurposeForm>) => {
    try {
      await apiRequest("POST", "/api/brand-purpose/auto-save", formData);
    } catch (error) {
      console.error("Auto-save failed:", error);
    }
  };

  // Watch for changes and trigger guidance/auto-save
  useEffect(() => {
    const { brandName, productsServices, corePurpose, audience } = watchedValues;
    
    // Check if first three questions are filled (waterfall trigger)
    if (brandName?.length > 0 && productsServices?.length > 10 && corePurpose?.length > 10) {
      // Auto-save current progress
      autoSaveProgress(watchedValues);
      
      // Generate guidance if we have audience info too
      if (audience?.length > 10 && !showGuidance) {
        generateGuidance(watchedValues);
      }
    }
  }, [watchedValues.brandName, watchedValues.productsServices, watchedValues.corePurpose, watchedValues.audience]);

  const onSubmit = async (data: BrandPurposeForm) => {
    try {
      setLoading(true);
      
      // Upload logo if provided
      let logoUrl = "";
      if (logoFile) {
        const formData = new FormData();
        formData.append('logo', logoFile);
        
        const logoResponse = await apiRequest("POST", "/api/upload-logo", formData);
        const logoData = await logoResponse.json();
        logoUrl = logoData.logoUrl;
      }
      
      const brandData = {
        ...data,
        logoUrl,
      };
      
      await apiRequest("POST", "/api/brand-purpose", brandData);
      
      toast({
        title: isExistingData ? "Brand Purpose Updated" : "Brand Purpose Saved",
        description: isExistingData ? "Your brand purpose has been updated successfully" : "Your brand purpose has been saved to your profile successfully",
      });
      
      setLocation("/schedule");
    } catch (error: any) {
      console.error("Brand purpose error:", error);
      toast({
        title: "Brand Purpose Failed",
        description: error.message || "Failed to save brand purpose",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file size and type
      if (file.size > 500000) { // 500KB
        toast({
          title: "File Too Large",
          description: "Logo must be under 500KB",
          variant: "destructive",
        });
        return;
      }
      
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Invalid File Type",
          description: "Please upload a PNG or JPG image",
          variant: "destructive",
        });
        return;
      }
      
      setLogoFile(file);
    }
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f5f5f5' }}>
      <MasterHeader showUserMenu={true} />
      
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="mb-6">
          <BackButton to="/schedule" label="Back to Schedule" />
        </div>
        
        <div className="text-center mb-8">
          <p className="text-sm text-gray-600">step 2 of 3</p>
          <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
            <div className="bg-blue-600 h-2 rounded-full w-2/3"></div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-8">
          <h2 className="text-2xl font-normal text-center mb-8" style={{ color: '#333333' }}>
            {isExistingData ? 'update your brand purpose' : 'define your brand purpose'}
          </h2>
          
          {isExistingData && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <div className="flex items-center">
                <div className="w-4 h-4 rounded-full bg-blue-500 mr-2"></div>
                <p className="text-sm text-blue-800">
                  Your brand purpose is already saved to your profile. You can update any information below.
                </p>
              </div>
            </div>
          )}



          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Brand Name */}
            <div>
              <Label htmlFor="brandName" className="text-sm font-medium text-gray-700">What's your brand name?</Label>
              <div className="relative group">
                <Input
                  id="brandName"
                  {...form.register('brandName')}
                  placeholder="The AgencyIQ"
                  className="mt-1"
                />
                <div className="absolute inset-x-0 top-full mt-1 bg-purple-50 border border-purple-200 rounded-lg p-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10">
                  <div className="flex items-start space-x-2">
                    <Bot className="w-4 h-4 text-purple-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-medium text-purple-900 mb-1">Grok Strategyzer tip:</p>
                      <p className="text-xs text-purple-800">Your brand name should connect to your value proposition and target customer segment</p>
                    </div>
                  </div>
                </div>
              </div>
              {form.formState.errors.brandName && (
                <p className="text-sm text-red-600 mt-1">{form.formState.errors.brandName.message}</p>
              )}
            </div>

            {/* Products/Services */}
            <div>
              <Label htmlFor="productsServices" className="text-sm font-medium text-gray-700">What products or services does your brand offer?</Label>
              <div className="relative group">
                <Textarea
                  id="productsServices"
                  {...form.register('productsServices')}
                  placeholder="Value proposition: You're invisible, that sucks. AgencyIQ gives you a beacon that's always on. The pain: You're invisible, and silence is killing your growth. The gain: You show up. Week in, week out. Professionally. Strategically. Automatically. Starter Subscription, 10 posts + 2 Free: $19.99/30 days Growth Subscription, 25 posts + 2 Free: $41.99/30 days Professional Subscription, 45 posts + 2 Free: $99.99/30 days"
                  className="mt-1 resize-none"
                  rows={3}
                />
                <div className="absolute inset-x-0 top-full mt-1 bg-purple-50 border border-purple-200 rounded-lg p-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10">
                  <div className="flex items-start space-x-2">
                    <Bot className="w-4 h-4 text-purple-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-medium text-purple-900 mb-1">Grok Strategyzer tip:</p>
                      <p className="text-xs text-purple-800">Define your value proposition - what specific gain do you create or pain do you relieve?</p>
                    </div>
                  </div>
                </div>
              </div>
              {form.formState.errors.productsServices && (
                <p className="text-sm text-red-600 mt-1">{form.formState.errors.productsServices.message}</p>
              )}
            </div>

            {/* Core Purpose */}
            <div>
              <Label htmlFor="corePurpose" className="text-sm font-medium text-gray-700">What's your brand's core purpose?</Label>
              <div className="relative group">
                <Textarea
                  id="corePurpose"
                  {...form.register('corePurpose')}
                  placeholder="To stop good local businesses from dying quietly, to 'Keep me visible even when I am too busy to show up, not just visibility, but validation. For those who want what the big brands have: presence, polish, and power, without the army it takes to get there.'"
                  className="mt-1 resize-none"
                  rows={3}
                />
                <div className="absolute inset-x-0 top-full mt-1 bg-purple-50 border border-purple-200 rounded-lg p-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10">
                  <div className="flex items-start space-x-2">
                    <Bot className="w-4 h-4 text-purple-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-medium text-purple-900 mb-1">Grok Strategyzer tip:</p>
                      <p className="text-xs text-purple-800">Your core purpose defines your mission - focus on the customer jobs you help complete</p>
                    </div>
                  </div>
                </div>
              </div>
              {form.formState.errors.corePurpose && (
                <p className="text-sm text-red-600 mt-1">{form.formState.errors.corePurpose.message}</p>
              )}
            </div>

            {/* Ideal Audience */}
            <div>
              <Label htmlFor="audience" className="text-sm font-medium text-gray-700">Who's your ideal audience?</Label>
              <div className="relative group">
                <Textarea
                  id="audience"
                  {...form.register('audience')}
                  placeholder="Queensland SMEs, primarily businesses with 1-50 employees"
                  className="mt-1 resize-none"
                  rows={3}
                />
                <div className="absolute inset-x-0 top-full mt-1 bg-purple-50 border border-purple-200 rounded-lg p-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10">
                  <div className="flex items-start space-x-2">
                    <Bot className="w-4 h-4 text-purple-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-medium text-purple-900 mb-1">Grok Strategyzer tip:</p>
                      <p className="text-xs text-purple-800">Define your customer segment - demographics, behaviors, and needs they share</p>
                    </div>
                  </div>
                </div>
              </div>
              {form.formState.errors.audience && (
                <p className="text-sm text-red-600 mt-1">{form.formState.errors.audience.message}</p>
              )}
            </div>

            {/* Job to Be Done */}
            <div>
              <Label htmlFor="jobToBeDone" className="text-sm font-medium text-gray-700">What job does your brand do for customers?</Label>
              <div className="relative group">
                <Textarea
                  id="jobToBeDone"
                  {...form.register('jobToBeDone')}
                  placeholder="Streamline operations and automate business processes"
                  className="mt-1 resize-none"
                  rows={3}
                />
                <div className="absolute inset-x-0 top-full mt-1 bg-purple-50 border border-purple-200 rounded-lg p-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10">
                  <div className="flex items-start space-x-2">
                    <Bot className="w-4 h-4 text-purple-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-medium text-purple-900 mb-1">Grok Strategyzer tip:</p>
                      <p className="text-xs text-purple-800">Customer job-to-be-done - what functional, emotional, or social job do customers hire you for?</p>
                    </div>
                  </div>
                </div>
              </div>
              {form.formState.errors.jobToBeDone && (
                <p className="text-sm text-red-600 mt-1">{form.formState.errors.jobToBeDone.message}</p>
              )}
            </div>

            {/* Motivations */}
            <div>
              <Label htmlFor="motivations" className="text-sm font-medium text-gray-700">What motivates your audience?</Label>
              <div className="relative group">
                <Textarea
                  id="motivations"
                  {...form.register('motivations')}
                  placeholder="Feel confident and competitive in the digital landscape"
                  className="mt-1 resize-none"
                  rows={3}
                />
                <div className="absolute inset-x-0 top-full mt-1 bg-purple-50 border border-purple-200 rounded-lg p-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10">
                  <div className="flex items-start space-x-2">
                    <Bot className="w-4 h-4 text-purple-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-medium text-purple-900 mb-1">Grok Strategyzer tip:</p>
                      <p className="text-xs text-purple-800">Customer gains - what benefits, outcomes, and characteristics your customers want</p>
                    </div>
                  </div>
                </div>
              </div>
              {form.formState.errors.motivations && (
                <p className="text-sm text-red-600 mt-1">{form.formState.errors.motivations.message}</p>
              )}
            </div>

            {/* Pain Points */}
            <div>
              <Label htmlFor="painPoints" className="text-sm font-medium text-gray-700">What are their pain points?</Label>
              <div className="relative group">
                <Textarea
                  id="painPoints"
                  {...form.register('painPoints')}
                  placeholder="Fear of being left behind in the digital economy"
                  className="mt-1 resize-none"
                  rows={3}
                />
                <div className="absolute inset-x-0 top-full mt-1 bg-purple-50 border border-purple-200 rounded-lg p-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10">
                  <div className="flex items-start space-x-2">
                    <Bot className="w-4 h-4 text-purple-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-medium text-purple-900 mb-1">Grok Strategyzer tip:</p>
                      <p className="text-xs text-purple-800">Customer pains - frustrations, obstacles, and risks your customers experience</p>
                    </div>
                  </div>
                </div>
              </div>
              {form.formState.errors.painPoints && (
                <p className="text-sm text-red-600 mt-1">{form.formState.errors.painPoints.message}</p>
              )}
            </div>

            {/* Goals with Measurable Metrics */}
            <div>
              <Label className="text-sm font-medium text-gray-700">What are your specific goals with measurable targets?</Label>
              <div className="text-xs text-purple-600 mt-1 mb-3 flex items-center">
                <div className="w-4 h-4 rounded-full mr-1" style={{ backgroundColor: '#915fd7' }}></div>
                Grok Strategyzer tip: Your value proposition must align with customer jobs, pains, and gains. Select measurable goals.
              </div>
              <div className="mt-3 space-y-4">
                <div className="flex items-start space-x-3">
                  <Checkbox
                    id="driveTraffic"
                    checked={form.watch('goals.driveTraffic')}
                    onCheckedChange={(checked) => form.setValue('goals.driveTraffic', !!checked)}
                  />
                  <div className="flex-1">
                    <Label htmlFor="driveTraffic" className="text-sm text-gray-700">Drive traffic to website</Label>
                    {form.watch('goals.driveTraffic') && (
                      <div className="mt-2 space-y-2">
                        <Input
                          {...form.register('goals.websiteUrl')}
                          placeholder="Enter website URL (e.g., https://queenslandartisans.com)"
                        />
                        <Input
                          {...form.register('goals.trafficTarget')}
                          placeholder="Monthly traffic target (e.g., 500 visitors per month)"
                        />
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <Checkbox
                    id="buildBrand"
                    checked={form.watch('goals.buildBrand')}
                    onCheckedChange={(checked) => form.setValue('goals.buildBrand', !!checked)}
                  />
                  <div className="flex-1">
                    <Label htmlFor="buildBrand" className="text-sm text-gray-700">Build brand awareness</Label>
                    {form.watch('goals.buildBrand') && (
                      <div className="mt-2 space-y-2">
                        <Input
                          {...form.register('goals.followerTarget')}
                          placeholder="Follower growth target (e.g., 200 new followers per month)"
                        />
                        <Input
                          {...form.register('goals.reachTarget')}
                          placeholder="Monthly reach target (e.g., 5,000 people reached)"
                        />
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <Checkbox
                    id="makeSales"
                    checked={form.watch('goals.makeSales')}
                    onCheckedChange={(checked) => form.setValue('goals.makeSales', !!checked)}
                  />
                  <div className="flex-1">
                    <Label htmlFor="makeSales" className="text-sm text-gray-700">Generate sales</Label>
                    {form.watch('goals.makeSales') && (
                      <div className="mt-2 space-y-2">
                        <Input
                          {...form.register('goals.salesUrl')}
                          placeholder="Enter sales URL (e.g., https://queenslandartisans.com/shop)"
                        />
                        <Input
                          {...form.register('goals.salesTarget')}
                          placeholder="Monthly sales target (e.g., $2,000 revenue per month)"
                        />
                        <Input
                          {...form.register('goals.conversionTarget')}
                          placeholder="Conversion rate target (e.g., 3% of visitors make purchase)"
                        />
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <Checkbox
                    id="generateLeads"
                    checked={form.watch('goals.generateLeads')}
                    onCheckedChange={(checked) => form.setValue('goals.generateLeads', !!checked)}
                  />
                  <div className="flex-1">
                    <Label htmlFor="generateLeads" className="text-sm text-gray-700">Generate leads</Label>
                    {form.watch('goals.generateLeads') && (
                      <div className="mt-2 space-y-2">
                        <Input
                          {...form.register('goals.leadTarget')}
                          placeholder="Monthly lead target (e.g., 50 qualified leads per month)"
                        />
                        <Input
                          {...form.register('goals.engagementTarget')}
                          placeholder="Engagement rate target (e.g., 4% average engagement rate)"
                        />
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <Checkbox
                    id="informEducate"
                    checked={form.watch('goals.informEducate')}
                    onCheckedChange={(checked) => form.setValue('goals.informEducate', !!checked)}
                  />
                  <div className="flex-1">
                    <Label htmlFor="informEducate" className="text-sm text-gray-700">Inform or educate</Label>
                    {form.watch('goals.informEducate') && (
                      <div className="mt-2 space-y-2">
                        <Textarea
                          {...form.register('goals.keyMessage')}
                          placeholder="What's your key message? (e.g., promote sustainability in art)"
                          className="resize-none"
                          rows={2}
                        />
                        <Input
                          {...form.register('goals.educationTarget')}
                          placeholder="Education goal (e.g., 1,000 people educated about sustainability monthly)"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Logo Upload */}
            <div>
              <Label htmlFor="logo" className="text-sm font-medium text-gray-700">Upload your brand logo</Label>
              <div className="mt-2 flex items-center space-x-3">
                <Input
                  id="logo"
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="hidden"
                />
                <Label
                  htmlFor="logo"
                  className="cursor-pointer inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Choose File
                </Label>
                {logoFile && (
                  <span className="text-sm text-gray-600">{logoFile.name}</span>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-1">Max 500KB, 300x300px recommended, PNG/JPG</p>
            </div>

            {/* Contact Details */}
            <div>
              <Label className="text-sm font-medium text-gray-700">Contact Details</Label>
              <div className="mt-3 space-y-4">
                <div>
                  <Label htmlFor="email" className="text-sm text-gray-600">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    {...form.register('contactDetails.email')}
                    placeholder="info@queenslandartisans.com"
                    className="mt-1"
                  />
                  {form.formState.errors.contactDetails?.email && (
                    <p className="text-sm text-red-600 mt-1">{form.formState.errors.contactDetails.email.message}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="phone" className="text-sm text-gray-600">Phone</Label>
                  <Input
                    id="phone"
                    type="tel"
                    {...form.register('contactDetails.phone')}
                    placeholder="+61 7 1234 5678"
                    className="mt-1"
                  />
                </div>
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 text-lg font-medium"
              disabled={loading}
              style={{ backgroundColor: '#3250fa' }}
            >
              {loading ? "Saving..." : "Next"}
            </Button>
          </form>
        </div>
      </div>
      
      <MasterFooter />
    </div>
  );
}