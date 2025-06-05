import { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Header from "@/components/header";
import Footer from "@/components/footer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiRequest } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

const signupSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  phone: z.string().min(10, "Phone number must be at least 10 characters"),
  code: z.string().optional(),
});

type SignupForm = z.infer<typeof signupSchema>;

export default function Signup() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [step, setStep] = useState<'details' | 'verification'>('details');
  const [loading, setLoading] = useState(false);

  const form = useForm<SignupForm>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      email: "testuser@email.com",
      password: "password123", 
      phone: "+15005550006",
    },
  });

  const sendVerificationCode = async () => {
    try {
      setLoading(true);
      const phone = form.getValues('phone');
      
      await apiRequest("POST", "/api/send-verification-code", { phone });
      
      setStep('verification');
      toast({
        title: "Code Sent",
        description: "Verification code has been sent to your phone",
      });
    } catch (error: any) {
      console.error("Send code error:", error);
      toast({
        title: "Error",
        description: "Failed to send verification code",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: SignupForm) => {
    try {
      setLoading(true);
      
      await apiRequest("POST", "/api/verify-and-signup", data);
      
      toast({
        title: "Account Created",
        description: "Your account has been created successfully",
      });
      
      setLocation("/subscription");
    } catch (error: any) {
      console.error("Signup error:", error);
      toast({
        title: "Signup Failed",
        description: error.message || "Failed to create account",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header showBack="/subscription" />
      
      <div className="max-w-md mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <Card className="card-agencyiq">
          <CardContent className="p-8">
            <h2 className="text-heading font-light text-foreground text-center mb-8 lowercase">
              create your account
            </h2>
            
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-sections">
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium text-foreground lowercase">email</Label>
                  <Input
                    type="email"
                    {...form.register('email')}
                    className="mt-2"
                    disabled={step === 'verification'}
                  />
                  {form.formState.errors.email && (
                    <p className="text-sm text-destructive mt-1">{form.formState.errors.email.message}</p>
                  )}
                </div>
                
                <div>
                  <Label className="text-sm font-medium text-foreground lowercase">password</Label>
                  <Input
                    type="password"
                    {...form.register('password')}
                    className="mt-2"
                    disabled={step === 'verification'}
                  />
                  {form.formState.errors.password && (
                    <p className="text-sm text-destructive mt-1">{form.formState.errors.password.message}</p>
                  )}
                </div>
                
                <div>
                  <Label className="text-sm font-medium text-foreground lowercase">phone</Label>
                  <Input
                    type="tel"
                    {...form.register('phone')}
                    className="mt-2"
                    disabled={step === 'verification'}
                  />
                  {form.formState.errors.phone && (
                    <p className="text-sm text-destructive mt-1">{form.formState.errors.phone.message}</p>
                  )}
                </div>
              </div>
              
              {step === 'details' && (
                <Button
                  type="button"
                  onClick={sendVerificationCode}
                  className="w-full btn-primary"
                  disabled={loading}
                >
                  {loading ? 'sending...' : 'send code'}
                </Button>
              )}
              
              {step === 'verification' && (
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium text-foreground lowercase">verification code</Label>
                    <Input
                      type="text"
                      placeholder="enter 6-digit code"
                      {...form.register('code')}
                      className="mt-2"
                    />
                    {form.formState.errors.code && (
                      <p className="text-sm text-destructive mt-1">{form.formState.errors.code.message}</p>
                    )}
                  </div>
                  
                  <Button
                    type="submit"
                    className="w-full btn-secondary"
                    disabled={loading}
                  >
                    {loading ? 'verifying...' : 'verify'}
                  </Button>
                </div>
              )}
            </form>
          </CardContent>
        </Card>
      </div>

      <Footer />
    </div>
  );
}
