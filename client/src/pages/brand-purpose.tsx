import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Header from "@/components/header";
import Footer from "@/components/footer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { apiRequest } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

const brandPurposeSchema = z.object({
  corePurpose: z.string().min(10, "Core purpose must be at least 10 characters"),
  audience: z.string().min(10, "Ideal audience must be at least 10 characters"),
  goals: z.string().min(10, "Business goals must be at least 10 characters"),
});

type BrandPurposeForm = z.infer<typeof brandPurposeSchema>;

export default function BrandPurpose() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const form = useForm<BrandPurposeForm>({
    resolver: zodResolver(brandPurposeSchema),
    defaultValues: {
      corePurpose: "Help local Queensland businesses grow their online presence through strategic social media marketing and automation.",
      audience: "Small to medium business owners in Queensland who want to improve their social media presence but lack the time or expertise to manage it themselves.",
      goals: "Increase brand awareness, generate quality leads, build customer relationships, and establish thought leadership in the local market.",
    },
  });

  const onSubmit = async (data: BrandPurposeForm) => {
    try {
      setLoading(true);
      
      await apiRequest("POST", "/api/brand-purpose", data);
      
      toast({
        title: "Brand Purpose Saved",
        description: "Your brand purpose has been saved successfully",
      });
      
      setLocation("/platform-connections");
    } catch (error: any) {
      console.error("Brand purpose error:", error);
      toast({
        title: "Error",
        description: "Failed to save brand purpose",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header showBack="/subscription" />
      
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-8">
          <p className="text-sm text-foreground lowercase">step 2 of 3</p>
          <div className="w-full bg-muted rounded-full h-2 mt-2">
            <div className="bg-primary h-2 rounded-full w-2/3"></div>
          </div>
        </div>

        <Card className="card-agencyiq">
          <CardContent className="p-8">
            <h2 className="text-heading font-light text-foreground text-center mb-8 lowercase">
              define your brand purpose
            </h2>
            
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-sections">
              <div>
                <Label className="text-sm font-medium text-foreground mb-2 lowercase">core purpose</Label>
                <Textarea
                  rows={4}
                  placeholder="what is the core purpose of your business?"
                  {...form.register('corePurpose')}
                  className="mt-2"
                />
                {form.formState.errors.corePurpose && (
                  <p className="text-sm text-destructive mt-1">{form.formState.errors.corePurpose.message}</p>
                )}
              </div>
              
              <div>
                <Label className="text-sm font-medium text-foreground mb-2 lowercase">ideal audience</Label>
                <Textarea
                  rows={4}
                  placeholder="who is your ideal customer?"
                  {...form.register('audience')}
                  className="mt-2"
                />
                {form.formState.errors.audience && (
                  <p className="text-sm text-destructive mt-1">{form.formState.errors.audience.message}</p>
                )}
              </div>
              
              <div>
                <Label className="text-sm font-medium text-foreground mb-2 lowercase">business goals</Label>
                <Textarea
                  rows={4}
                  placeholder="what are your main business objectives?"
                  {...form.register('goals')}
                  className="mt-2"
                />
                {form.formState.errors.goals && (
                  <p className="text-sm text-destructive mt-1">{form.formState.errors.goals.message}</p>
                )}
              </div>
              
              <Button
                type="submit"
                className="w-full btn-secondary"
                disabled={loading}
              >
                {loading ? 'saving...' : 'next'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      <Footer />
    </div>
  );
}
