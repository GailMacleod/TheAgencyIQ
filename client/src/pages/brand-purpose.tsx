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
import { useMutation } from "@tanstack/react-query";
import MasterHeader from "@/components/master-header";
import MasterFooter from "@/components/master-footer";

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

  const form = useForm<BrandPurposeForm>({
    resolver: zodResolver(brandPurposeSchema),
    defaultValues: {
      brandName: "Queensland Artisans Co.",
      productsServices: "Handcrafted pottery, local art prints, and unique Queensland-made gifts that celebrate local artistry and craftsmanship.",
      corePurpose: "Support local Queensland artisans by connecting them with customers who value authentic, handmade products and local craftsmanship.",
      audience: "Queensland locals aged 25-45 who appreciate unique, locally-made products and want to support their community's artists and craftspeople.",
      jobToBeDone: "Help customers find unique, authentic local gifts that tell a story and support Queensland's creative community.",
      motivations: "They value supporting local artists, want unique products that aren't mass-produced, and appreciate the story behind handmade items.",
      painPoints: "Hard to find authentic local products, uncertainty about quality, lack of connection to the artists, limited time to search for unique gifts.",
      goals: {
        driveTraffic: true,
        websiteUrl: "https://queenslandartisans.com",
        trafficTarget: "500 visitors per month",
        buildBrand: true,
        followerTarget: "200 new followers per month",
        reachTarget: "5,000 people reached monthly",
        makeSales: true,
        salesUrl: "https://queenslandartisans.com/shop",
        salesTarget: "$2,000 revenue per month",
        conversionTarget: "3% of visitors make purchase",
        generateLeads: true,
        leadTarget: "50 qualified leads per month",
        engagementTarget: "4% average engagement rate",
        informEducate: false,
        keyMessage: "",
        educationTarget: "",
      },
      contactDetails: {
        email: "info@queenslandartisans.com",
        phone: "+61 7 1234 5678",
      },
    },
  });

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
        title: "Brand Purpose Saved",
        description: "Your brand purpose has been saved successfully",
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
        <div className="text-center mb-8">
          <p className="text-sm text-gray-600">step 2 of 3</p>
          <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
            <div className="bg-blue-600 h-2 rounded-full w-2/3"></div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-8">
          <h2 className="text-2xl font-normal text-center mb-8" style={{ color: '#333333' }}>
            define your brand purpose
          </h2>

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Brand Name */}
            <div>
              <Label htmlFor="brandName" className="text-sm font-medium text-gray-700">What's your brand name?</Label>
              <div className="relative">
                <Input
                  id="brandName"
                  {...form.register('brandName')}
                  placeholder="try 'Queensland Artisans Co.'"
                  className="mt-1"
                />
                <div className="flex items-center justify-between mt-1">
                  <div className="text-xs text-purple-600 flex items-center">
                    <div className="w-4 h-4 rounded-full mr-1" style={{ backgroundColor: '#915fd7' }}></div>
                    Grok Strategyzer tip: Your brand name should connect to your value proposition and target customer segment
                  </div>
                  {form.watch('brandName') && form.watch('brandName').length > 2 && (
                    <div className="flex items-center">
                      {form.watch('brandName').length > 10 ? (
                        <div className="flex items-center text-xs text-green-600">
                          <div className="w-2 h-2 bg-green-600 rounded-full mr-1"></div>
                          Strong
                        </div>
                      ) : (
                        <div className="flex items-center text-xs text-orange-600">
                          <div className="w-2 h-2 bg-orange-600 rounded-full mr-1"></div>
                          Weak
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
              {form.formState.errors.brandName && (
                <p className="text-sm text-red-600 mt-1">{form.formState.errors.brandName.message}</p>
              )}
            </div>

            {/* Products/Services */}
            <div>
              <Label htmlFor="productsServices" className="text-sm font-medium text-gray-700">What products or services does your brand offer?</Label>
              <Textarea
                id="productsServices"
                {...form.register('productsServices')}
                placeholder="e.g., handcrafted pottery, local art prints"
                className="mt-1 resize-none"
                rows={3}
              />
              <div className="flex items-center justify-between mt-1">
                <div className="text-xs text-purple-600 flex items-center">
                  <div className="w-4 h-4 rounded-full mr-1" style={{ backgroundColor: '#915fd7' }}></div>
                  Grok Strategyzer tip: Define your value proposition - what specific gain do you create or pain do you relieve?
                </div>
                {form.watch('productsServices') && form.watch('productsServices').length > 20 && (
                  <div className="flex items-center">
                    {form.watch('productsServices').length > 50 && form.watch('productsServices').includes('queensland') ? (
                      <div className="flex items-center text-xs text-green-600">
                        <div className="w-2 h-2 bg-green-600 rounded-full mr-1"></div>
                        Strong
                      </div>
                    ) : (
                      <div className="flex items-center text-xs text-orange-600">
                        <div className="w-2 h-2 bg-orange-600 rounded-full mr-1"></div>
                        Weak
                      </div>
                    )}
                  </div>
                )}
              </div>
              {form.formState.errors.productsServices && (
                <p className="text-sm text-red-600 mt-1">{form.formState.errors.productsServices.message}</p>
              )}
            </div>

            {/* Core Purpose */}
            <div>
              <Label htmlFor="corePurpose" className="text-sm font-medium text-gray-700">What's your brand's core purpose?</Label>
              <Textarea
                id="corePurpose"
                {...form.register('corePurpose')}
                placeholder="e.g., support local queensland artisans"
                className="mt-1 resize-none"
                rows={3}
              />
              <div className="flex items-center justify-between mt-1">
                <div className="text-xs text-purple-600 flex items-center">
                  <div className="w-4 h-4 rounded-full mr-1" style={{ backgroundColor: '#915fd7' }}></div>
                  Grok Strategyzer tip: Your core purpose defines your mission - focus on the customer jobs you help complete
                </div>
                {form.watch('corePurpose') && form.watch('corePurpose').length > 15 && (
                  <div className="flex items-center">
                    {form.watch('corePurpose').length > 40 && (form.watch('corePurpose').includes('help') || form.watch('corePurpose').includes('support') || form.watch('corePurpose').includes('enable')) ? (
                      <div className="flex items-center text-xs text-green-600">
                        <div className="w-2 h-2 bg-green-600 rounded-full mr-1"></div>
                        Strong
                      </div>
                    ) : (
                      <div className="flex items-center text-xs text-orange-600">
                        <div className="w-2 h-2 bg-orange-600 rounded-full mr-1"></div>
                        Weak
                      </div>
                    )}
                  </div>
                )}
              </div>
              {form.formState.errors.corePurpose && (
                <p className="text-sm text-red-600 mt-1">{form.formState.errors.corePurpose.message}</p>
              )}
            </div>

            {/* Ideal Audience */}
            <div>
              <Label htmlFor="audience" className="text-sm font-medium text-gray-700">Who's your ideal audience?</Label>
              <Textarea
                id="audience"
                {...form.register('audience')}
                placeholder="e.g., queensland locals aged 25-45"
                className="mt-1 resize-none"
                rows={3}
              />
              <div className="flex items-center justify-between mt-1">
                <div className="text-xs text-purple-600 flex items-center">
                  <div className="w-4 h-4 rounded-full mr-1" style={{ backgroundColor: '#915fd7' }}></div>
                  Grok Strategyzer tip: Define your customer segment - demographics, behaviors, and needs they share
                </div>
                {form.watch('audience') && form.watch('audience').length > 10 && (
                  <div className="flex items-center">
                    {form.watch('audience').length > 30 && (form.watch('audience').includes('queensland') || form.watch('audience').includes('age') || form.watch('audience').includes('business') || form.watch('audience').includes('small')) ? (
                      <div className="flex items-center text-xs text-green-600">
                        <div className="w-2 h-2 bg-green-600 rounded-full mr-1"></div>
                        Strong
                      </div>
                    ) : (
                      <div className="flex items-center text-xs text-orange-600">
                        <div className="w-2 h-2 bg-orange-600 rounded-full mr-1"></div>
                        Weak
                      </div>
                    )}
                  </div>
                )}
              </div>
              {form.formState.errors.audience && (
                <p className="text-sm text-red-600 mt-1">{form.formState.errors.audience.message}</p>
              )}
            </div>

            {/* Job to Be Done */}
            <div>
              <Label htmlFor="jobToBeDone" className="text-sm font-medium text-gray-700">What job does your brand do for customers?</Label>
              <Textarea
                id="jobToBeDone"
                {...form.register('jobToBeDone')}
                placeholder="e.g., help customers find unique, local gifts"
                className="mt-1 resize-none"
                rows={3}
              />
              <div className="flex items-center justify-between mt-1">
                <div className="text-xs text-purple-600 flex items-center">
                  <div className="w-4 h-4 rounded-full mr-1" style={{ backgroundColor: '#915fd7' }}></div>
                  Grok Strategyzer tip: Customer job-to-be-done - what functional, emotional, or social job do customers hire you for?
                </div>
                {form.watch('jobToBeDone') && form.watch('jobToBeDone').length > 15 && (
                  <div className="flex items-center">
                    {form.watch('jobToBeDone').length > 35 && (form.watch('jobToBeDone').includes('help') || form.watch('jobToBeDone').includes('find') || form.watch('jobToBeDone').includes('solve') || form.watch('jobToBeDone').includes('enable')) ? (
                      <div className="flex items-center text-xs text-green-600">
                        <div className="w-2 h-2 bg-green-600 rounded-full mr-1"></div>
                        Strong
                      </div>
                    ) : (
                      <div className="flex items-center text-xs text-orange-600">
                        <div className="w-2 h-2 bg-orange-600 rounded-full mr-1"></div>
                        Weak
                      </div>
                    )}
                  </div>
                )}
              </div>
              {form.formState.errors.jobToBeDone && (
                <p className="text-sm text-red-600 mt-1">{form.formState.errors.jobToBeDone.message}</p>
              )}
            </div>

            {/* Motivations */}
            <div>
              <Label htmlFor="motivations" className="text-sm font-medium text-gray-700">What motivates your audience?</Label>
              <Textarea
                id="motivations"
                {...form.register('motivations')}
                placeholder="e.g., they value supporting local artists"
                className="mt-1 resize-none"
                rows={3}
              />
              <div className="flex items-center justify-between mt-1">
                <div className="text-xs text-purple-600 flex items-center">
                  <div className="w-4 h-4 rounded-full mr-1" style={{ backgroundColor: '#915fd7' }}></div>
                  Grok Strategyzer tip: Customer gains - what benefits, outcomes, and characteristics your customers want
                </div>
                {form.watch('motivations') && form.watch('motivations').length > 10 && (
                  <div className="flex items-center">
                    {form.watch('motivations').length > 25 && (form.watch('motivations').includes('value') || form.watch('motivations').includes('support') || form.watch('motivations').includes('quality') || form.watch('motivations').includes('local')) ? (
                      <div className="flex items-center text-xs text-green-600">
                        <div className="w-2 h-2 bg-green-600 rounded-full mr-1"></div>
                        Strong
                      </div>
                    ) : (
                      <div className="flex items-center text-xs text-orange-600">
                        <div className="w-2 h-2 bg-orange-600 rounded-full mr-1"></div>
                        Weak
                      </div>
                    )}
                  </div>
                )}
              </div>
              {form.formState.errors.motivations && (
                <p className="text-sm text-red-600 mt-1">{form.formState.errors.motivations.message}</p>
              )}
            </div>

            {/* Pain Points */}
            <div>
              <Label htmlFor="painPoints" className="text-sm font-medium text-gray-700">What are their pain points?</Label>
              <Textarea
                id="painPoints"
                {...form.register('painPoints')}
                placeholder="e.g., hard to find authentic local products"
                className="mt-1 resize-none"
                rows={3}
              />
              <div className="flex items-center justify-between mt-1">
                <div className="text-xs text-purple-600 flex items-center">
                  <div className="w-4 h-4 rounded-full mr-1" style={{ backgroundColor: '#915fd7' }}></div>
                  Grok Strategyzer tip: Customer pains - frustrations, obstacles, and risks your customers experience
                </div>
                {form.watch('painPoints') && form.watch('painPoints').length > 10 && (
                  <div className="flex items-center">
                    {form.watch('painPoints').length > 25 && (form.watch('painPoints').includes('hard') || form.watch('painPoints').includes('difficult') || form.watch('painPoints').includes('struggle') || form.watch('painPoints').includes('lack')) ? (
                      <div className="flex items-center text-xs text-green-600">
                        <div className="w-2 h-2 bg-green-600 rounded-full mr-1"></div>
                        Strong
                      </div>
                    ) : (
                      <div className="flex items-center text-xs text-orange-600">
                        <div className="w-2 h-2 bg-orange-600 rounded-full mr-1"></div>
                        Weak
                      </div>
                    )}
                  </div>
                )}
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