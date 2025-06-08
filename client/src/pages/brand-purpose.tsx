import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Upload, X } from "lucide-react";
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
  brandName: z.string().min(2, "Brand name must be at least 2 characters").max(600, "Brand name must be 600 characters or less"),
  productsServices: z.string().min(10, "Products/services description must be at least 10 characters").max(600, "Products/services description must be 600 characters or less"),
  corePurpose: z.string().min(10, "Core purpose must be at least 10 characters").max(600, "Core purpose must be 600 characters or less"),
  audience: z.string().min(10, "Ideal audience must be at least 10 characters").max(600, "Ideal audience must be 600 characters or less"),
  jobToBeDone: z.string().min(10, "Job to be done must be at least 10 characters").max(600, "Job to be done must be 600 characters or less"),
  motivations: z.string().min(10, "Audience motivations must be at least 10 characters").max(600, "Audience motivations must be 600 characters or less"),
  painPoints: z.string().min(10, "Pain points must be at least 10 characters").max(600, "Pain points must be 600 characters or less"),
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
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
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
      // Populate form with existing data for editing
      const brandData = existingBrandPurpose as any;
      form.reset({
        brandName: brandData.brandName || "",
        productsServices: brandData.productsServices || "",
        corePurpose: brandData.corePurpose || "",
        audience: brandData.audience || "",
        jobToBeDone: brandData.jobToBeDone || "",
        motivations: brandData.motivations || "",
        painPoints: brandData.painPoints || "",
        goals: {
          driveTraffic: brandData.goals?.driveTraffic || false,
          websiteUrl: brandData.goals?.websiteUrl || "",
          trafficTarget: brandData.goals?.trafficTarget || "",
          buildBrand: brandData.goals?.buildBrand || false,
          followerTarget: brandData.goals?.followerTarget || "",
          reachTarget: brandData.goals?.reachTarget || "",
          makeSales: brandData.goals?.makeSales || false,
          salesUrl: brandData.goals?.salesUrl || "",
          salesTarget: brandData.goals?.salesTarget || "",
          conversionTarget: brandData.goals?.conversionTarget || "",
          generateLeads: brandData.goals?.generateLeads || false,
          leadTarget: brandData.goals?.leadTarget || "",
          engagementTarget: brandData.goals?.engagementTarget || "",
          informEducate: brandData.goals?.informEducate || false,
          keyMessage: brandData.goals?.keyMessage || "",
          educationTarget: brandData.goals?.educationTarget || "",
        },
        contactDetails: {
          email: brandData.contactDetails?.email || "",
          phone: brandData.contactDetails?.phone || "",
        },
      });
      
      // Set logo preview if exists
      if (brandData.logoUrl) {
        setLogoPreview(brandData.logoUrl);
      }
    }
  }, [existingBrandPurpose, form]);

  // Watch form values to trigger guidance after first three questions
  const watchedValues = (() => {
    try {
      return form.watch();
    } catch (error) {
      console.error("Form watch failed:", error);
      return {};
    }
  })();

  

  // Auto-save disabled to prevent server flooding
  const autoSaveMutation = useMutation({
    mutationFn: async (formData: Partial<BrandPurposeForm>) => {
      // Auto-save temporarily disabled
      return null;
    },
    onError: () => {},
    onSuccess: () => {},
    retry: false,
  });

  // Generate guidance mutation with proper error handling
  const guidanceMutation = useMutation({
    mutationFn: async (formData: Partial<BrandPurposeForm>) => {
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
        return result.guidance;
      } catch (error) {
        console.error("Guidance API request failed:", error);
        return null;
      }
    },
    onSuccess: (guidance) => {
      if (guidance) {
        setGuidance(guidance);
        setShowGuidance(true);
      }
    },
    onError: (error) => {
      console.error("Failed to generate guidance:", error);
      // Silently fail guidance generation
    },
    onSettled: () => {
      setIsGeneratingGuidance(false);
    },
  });

  // Generate guidance when form conditions are met
  useEffect(() => {
    if (!watchedValues || typeof watchedValues !== 'object') {
      return;
    }

    const {
      brandName = "",
      productsServices = "",
      corePurpose = "",
      audience = ""
    } = watchedValues;
    
    // Generate guidance if we have sufficient info
    if (brandName.length > 0 && productsServices.length > 10 && corePurpose.length > 10 && audience.length > 10 && !showGuidance && !isGeneratingGuidance) {
      setIsGeneratingGuidance(true);
      try {
        guidanceMutation.mutate(watchedValues);
      } catch (error) {
        console.error("Guidance mutation trigger failed:", error);
        setIsGeneratingGuidance(false);
      }
    }
  }, [watchedValues, showGuidance, isGeneratingGuidance]);

  // Form validation helper
  const validateFormData = (data: BrandPurposeForm) => {
    const requiredFields = [
      { field: 'brandName', name: 'Brand Name' },
      { field: 'productsServices', name: 'Products/Services' },
      { field: 'corePurpose', name: 'Core Purpose' },
      { field: 'audience', name: 'Ideal Audience' },
      { field: 'jobToBeDone', name: 'Job to be Done' },
      { field: 'motivations', name: 'Audience Motivations' },
      { field: 'painPoints', name: 'Pain Points' }
    ];

    const missingFields = requiredFields.filter(
      ({ field }) => !data[field as keyof BrandPurposeForm] || 
      (data[field as keyof BrandPurposeForm] as string).length < 10
    );

    return {
      isValid: missingFields.length === 0,
      missingFields: missingFields.map(f => f.name)
    };
  };

  const onSubmit = async (data: BrandPurposeForm) => {
    try {
      setLoading(true);
      
      // Validate form completeness
      const validation = validateFormData(data);
      if (!validation.isValid) {
        toast({
          title: "Incomplete Form",
          description: `Please complete: ${validation.missingFields.join(', ')}`,
          variant: "destructive",
        });
        return;
      }
      
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
        description: isExistingData ? "Your brand purpose has been updated and will inform your content schedule" : "Your brand purpose has been saved and will inform your content schedule",
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
      // Check file size (max 500KB)
      if (file.size > 500000) {
        toast({
          title: "File Too Large",
          description: "Logo must be under 500KB",
          variant: "destructive",
        });
        return;
      }
      
      // Check file type
      if (!file.type.match(/^image\/(png|jpeg|jpg)$/)) {
        toast({
          title: "Invalid File Type",
          description: "Please upload a PNG or JPG image",
          variant: "destructive",
        });
        return;
      }
      
      // Check image dimensions
      const img = new Image();
      const url = URL.createObjectURL(file);
      
      img.onload = function() {
        // Check minimum dimensions (at least 100x100)
        if (img.width < 100 || img.height < 100) {
          toast({
            title: "Image Too Small",
            description: "Logo must be at least 100x100 pixels",
            variant: "destructive",
          });
          URL.revokeObjectURL(url);
          return;
        }
        
        // Check maximum dimensions (max 1000x1000)
        if (img.width > 1000 || img.height > 1000) {
          toast({
            title: "Image Too Large",
            description: "Logo must be no larger than 1000x1000 pixels",
            variant: "destructive",
          });
          URL.revokeObjectURL(url);
          return;
        }
        
        // If all checks pass, set the file and preview
        setLogoFile(file);
        setLogoPreview(url);
        
        toast({
          title: "Logo Uploaded",
          description: `Logo uploaded successfully (${img.width}x${img.height}px)`,
        });
      };
      
      img.onerror = function() {
        toast({
          title: "Invalid Image",
          description: "The selected file is not a valid image",
          variant: "destructive",
        });
        URL.revokeObjectURL(url);
      };
      
      img.src = url;
    }
  };

  const handleDeleteLogo = () => {
    setLogoFile(null);
    if (logoPreview) {
      URL.revokeObjectURL(logoPreview);
      setLogoPreview(null);
    }
    // Clear the file input
    const fileInput = document.getElementById('logo') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
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
                  autoComplete="organization"
                />
                <div className="absolute inset-x-0 top-full mt-1 bg-purple-50 border border-purple-200 rounded-lg p-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10">
                  <div className="flex items-start space-x-2">
                    <Bot className="w-4 h-4 text-purple-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-medium text-purple-900 mb-1">Grok Strategyzer tip:</p>
                      <p className="text-xs text-purple-800">Your brand name should connect to your value proposition and target customer segment. Strong names communicate what you do and who you serve.</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between mt-2">
                <div className="flex items-center">
                  {(() => {
                    const brandName = form.watch('brandName') || '';
                    return brandName && brandName.length > 2 && (
                      <div className="flex items-center">
                        {brandName.length > 8 && (brandName.toLowerCase().includes('agency') || brandName.toLowerCase().includes('solutions') || brandName.toLowerCase().includes('group') || brandName.toLowerCase().includes('co')) ? (
                          <div className="flex items-center text-sm font-medium text-green-600 bg-green-50 px-2 py-1 rounded-md border border-green-200">
                            <div className="w-3 h-3 bg-green-600 rounded-full mr-2"></div>
                            Strong
                          </div>
                        ) : brandName.length > 5 ? (
                          <div className="flex items-center text-sm font-medium text-yellow-600 bg-yellow-50 px-2 py-1 rounded-md border border-yellow-200">
                            <div className="w-3 h-3 bg-yellow-600 rounded-full mr-2"></div>
                            Moderate
                          </div>
                        ) : (
                          <div className="flex items-center text-sm font-medium text-red-600 bg-red-50 px-2 py-1 rounded-md border border-red-200">
                            <div className="w-3 h-3 bg-red-600 rounded-full mr-2"></div>
                            Weak
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
                {(() => {
                  const brandName = form.watch('brandName') || '';
                  return brandName && (
                    <div className={`text-xs ${brandName.length > 600 ? 'text-red-600 font-medium' : brandName.length > 540 ? 'text-yellow-600' : 'text-gray-500'}`}>
                      {brandName.length || 0}/600
                    </div>
                  );
                })()}
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
                  autoComplete="off"
                />
                <div className="absolute inset-x-0 top-full mt-1 bg-purple-50 border border-purple-200 rounded-lg p-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10">
                  <div className="flex items-start space-x-2">
                    <Bot className="w-4 h-4 text-purple-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-medium text-purple-900 mb-1">Grok Strategyzer tip:</p>
                      <p className="text-xs text-purple-800">Define your value proposition - what specific gain do you create or pain do you relieve? Include pricing and packages for clarity.</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between mt-2">
                <div className="flex items-center">
                  {(() => {
                    const productsServices = form.watch('productsServices') || '';
                    return productsServices && productsServices.length > 20 && (
                      <div className="flex items-center">
                        {productsServices.length > 100 && (productsServices.toLowerCase().includes('pain') || productsServices.toLowerCase().includes('gain') || productsServices.toLowerCase().includes('value') || productsServices.toLowerCase().includes('$')) ? (
                          <div className="flex items-center text-sm font-medium text-green-600 bg-green-50 px-2 py-1 rounded-md border border-green-200">
                            <div className="w-3 h-3 bg-green-600 rounded-full mr-2"></div>
                            Strong
                          </div>
                        ) : productsServices.length > 50 ? (
                          <div className="flex items-center text-sm font-medium text-yellow-600 bg-yellow-50 px-2 py-1 rounded-md border border-yellow-200">
                            <div className="w-3 h-3 bg-yellow-600 rounded-full mr-2"></div>
                            Moderate
                          </div>
                        ) : (
                          <div className="flex items-center text-sm font-medium text-red-600 bg-red-50 px-2 py-1 rounded-md border border-red-200">
                            <div className="w-3 h-3 bg-red-600 rounded-full mr-2"></div>
                            Weak
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
                {(() => {
                  const productsServices = form.watch('productsServices') || '';
                  return productsServices && (
                    <div className={`text-xs ${productsServices.length > 600 ? 'text-red-600 font-medium' : productsServices.length > 540 ? 'text-yellow-600' : 'text-gray-500'}`}>
                      {productsServices.length || 0}/600
                    </div>
                  );
                })()}
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
                  autoComplete="off"
                />
                <div className="absolute inset-x-0 top-full mt-1 bg-purple-50 border border-purple-200 rounded-lg p-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10">
                  <div className="flex items-start space-x-2">
                    <Bot className="w-4 h-4 text-purple-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-medium text-purple-900 mb-1">Grok Strategyzer tip:</p>
                      <p className="text-xs text-purple-800">Your core purpose defines your mission - focus on the customer jobs you help complete. Strong purposes connect emotionally to customer outcomes.</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between mt-2">
                <div className="flex items-center">
                  {(() => {
                    const corePurpose = form.watch('corePurpose') || '';
                    return corePurpose && corePurpose.length > 20 && (
                      <div className="flex items-center">
                        {corePurpose.length > 80 && (corePurpose.toLowerCase().includes('help') || corePurpose.toLowerCase().includes('stop') || corePurpose.toLowerCase().includes('enable') || corePurpose.toLowerCase().includes('empower')) ? (
                          <div className="flex items-center text-sm font-medium text-green-600 bg-green-50 px-2 py-1 rounded-md border border-green-200">
                            <div className="w-3 h-3 bg-green-600 rounded-full mr-2"></div>
                            Strong
                          </div>
                        ) : corePurpose.length > 40 ? (
                          <div className="flex items-center text-sm font-medium text-yellow-600 bg-yellow-50 px-2 py-1 rounded-md border border-yellow-200">
                            <div className="w-3 h-3 bg-yellow-600 rounded-full mr-2"></div>
                            Moderate
                          </div>
                        ) : (
                          <div className="flex items-center text-sm font-medium text-red-600 bg-red-50 px-2 py-1 rounded-md border border-red-200">
                            <div className="w-3 h-3 bg-red-600 rounded-full mr-2"></div>
                            Weak
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
                {(() => {
                  const corePurpose = form.watch('corePurpose') || '';
                  return corePurpose && (
                    <div className={`text-xs ${corePurpose.length > 600 ? 'text-red-600 font-medium' : corePurpose.length > 540 ? 'text-yellow-600' : 'text-gray-500'}`}>
                      {corePurpose.length || 0}/600
                    </div>
                  );
                })()}
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
                  autoComplete="off"
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
              {(() => {
                const audience = form.watch('audience') || '';
                return audience && (
                  <div className="flex items-center justify-end mt-2">
                    <div className={`text-xs ${audience.length > 600 ? 'text-red-600 font-medium' : audience.length > 540 ? 'text-yellow-600' : 'text-gray-500'}`}>
                      {audience.length}/600
                    </div>
                  </div>
                );
              })()}
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
                  autoComplete="off"
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
              {(() => {
                const jobToBeDone = form.watch('jobToBeDone') || '';
                return jobToBeDone && (
                  <div className="flex items-center justify-end mt-2">
                    <div className={`text-xs ${jobToBeDone.length > 600 ? 'text-red-600 font-medium' : jobToBeDone.length > 540 ? 'text-yellow-600' : 'text-gray-500'}`}>
                      {jobToBeDone.length}/600
                    </div>
                  </div>
                );
              })()}
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
                  autoComplete="off"
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
              {(() => {
                const motivations = form.watch('motivations') || '';
                return motivations && (
                  <div className="flex items-center justify-end mt-2">
                    <div className={`text-xs ${motivations.length > 600 ? 'text-red-600 font-medium' : motivations.length > 540 ? 'text-yellow-600' : 'text-gray-500'}`}>
                      {motivations.length}/600
                    </div>
                  </div>
                );
              })()}
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
                  autoComplete="off"
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
              {(() => {
                const painPoints = form.watch('painPoints') || '';
                return painPoints && (
                  <div className="flex items-center justify-end mt-2">
                    <div className={`text-xs ${painPoints.length > 600 ? 'text-red-600 font-medium' : painPoints.length > 540 ? 'text-yellow-600' : 'text-gray-500'}`}>
                      {painPoints.length}/600
                    </div>
                  </div>
                );
              })()}
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
                          id="websiteUrl"
                          {...form.register('goals.websiteUrl')}
                          placeholder="Enter website URL (e.g., https://queenslandartisans.com)"
                          autoComplete="url"
                        />
                        <Input
                          id="trafficTarget"
                          {...form.register('goals.trafficTarget')}
                          placeholder="Monthly traffic target (e.g., 500 visitors per month)"
                          autoComplete="off"
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
                          id="followerTarget"
                          {...form.register('goals.followerTarget')}
                          placeholder="Follower growth target (e.g., 200 new followers per month)"
                          autoComplete="off"
                        />
                        <Input
                          id="reachTarget"
                          {...form.register('goals.reachTarget')}
                          placeholder="Monthly reach target (e.g., 5,000 people reached)"
                          autoComplete="off"
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
                          id="salesUrl"
                          {...form.register('goals.salesUrl')}
                          placeholder="Enter sales URL (e.g., https://queenslandartisans.com/shop)"
                          autoComplete="url"
                        />
                        <Input
                          id="salesTarget"
                          {...form.register('goals.salesTarget')}
                          placeholder="Monthly sales target (e.g., $2,000 revenue per month)"
                          autoComplete="off"
                        />
                        <Input
                          id="conversionTarget"
                          {...form.register('goals.conversionTarget')}
                          placeholder="Conversion rate target (e.g., 3% of visitors make purchase)"
                          autoComplete="off"
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
                          id="leadTarget"
                          {...form.register('goals.leadTarget')}
                          placeholder="Monthly lead target (e.g., 50 qualified leads per month)"
                          autoComplete="off"
                        />
                        <Input
                          id="engagementTarget"
                          {...form.register('goals.engagementTarget')}
                          placeholder="Engagement rate target (e.g., 4% average engagement rate)"
                          autoComplete="off"
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
                          id="keyMessage"
                          {...form.register('goals.keyMessage')}
                          placeholder="What's your key message? (e.g., promote sustainability in art)"
                          className="resize-none"
                          rows={2}
                          autoComplete="off"
                        />
                        <Input
                          id="educationTarget"
                          {...form.register('goals.educationTarget')}
                          placeholder="Education goal (e.g., 1,000 people educated about sustainability monthly)"
                          autoComplete="off"
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
              <div className="mt-2 flex items-start space-x-4">
                <div className="flex-1">
                  <Input
                    id="logo"
                    type="file"
                    accept="image/png,image/jpeg,image/jpg"
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
                    <span className="text-sm text-gray-600 ml-3">{logoFile.name}</span>
                  )}
                  <p className="text-xs text-gray-500 mt-1">Max 500KB, 100x100px minimum, 1000x1000px maximum, PNG/JPG only</p>
                </div>
                {logoPreview && (
                  <div className="flex-shrink-0">
                    <div className="relative w-20 h-20 border border-gray-300 rounded-lg overflow-hidden bg-gray-50 flex items-center justify-center">
                      <img 
                        src={logoPreview} 
                        alt="Logo preview" 
                        className="max-w-full max-h-full object-contain"
                      />
                      <button
                        type="button"
                        onClick={handleDeleteLogo}
                        className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center text-xs transition-colors"
                        title="Delete logo"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                    <p className="text-xs text-green-600 text-center mt-1">Preview</p>
                    <div className="flex justify-center mt-1">
                      <Label
                        htmlFor="logo"
                        className="cursor-pointer text-xs text-blue-600 hover:text-blue-800"
                      >
                        Change Logo
                      </Label>
                    </div>
                  </div>
                )}
              </div>
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
                    autoComplete="email"
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
                    autoComplete="tel"
                  />
                </div>
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 text-lg font-medium mt-6"
              disabled={loading}
              style={{ backgroundColor: '#3250fa' }}
            >
              {loading ? "Saving Brand Purpose..." : "Save Brand Purpose & Continue"}
            </Button>
          </form>
        </div>
      </div>
      
      <MasterFooter />
    </div>
  );
}