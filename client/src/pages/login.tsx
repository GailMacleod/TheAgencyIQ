import { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Header from "@/components/header";
import Footer from "@/components/footer";
import ForgotPasswordModal from "@/components/forgot-password-modal";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiRequest } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

const loginSchema = z.object({
  phone: z.string().min(10, "Valid phone number is required"),
  password: z.string().min(1, "Password is required"),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function Login() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  const form = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      phone: "+61413950520",
      password: "Tw33dl3dum!",
    },
  });

  const onSubmit = async (data: LoginForm) => {
    try {
      setLoading(true);
      
      const response = await apiRequest("POST", "/api/auth/login", data);
      const result = await response.json();
      
      console.log("Login response:", result);
      
      if (result.success && result.complete) {
        toast({
          title: "Login Successful",
          description: `Welcome back to AiQ at ${result.timestamp}`,
        });
        
        // Verify session before redirecting
        const sessionCheck = await fetch("/api/auth/session", {
          credentials: "include"
        });
        const sessionData = await sessionCheck.json();
        
        console.log("Session verification:", sessionData);
        
        if (sessionData.authenticated) {
          setLocation("/schedule");
        } else {
          throw new Error("Session verification failed");
        }
      } else {
        throw new Error(result.error || "Login failed");
      }
    } catch (error: any) {
      console.error("Login error:", error);
      toast({
        title: "Login Failed",
        description: error.message || "Invalid credentials",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header showBack="/" />
      
      <div className="max-w-md mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <Card className="card-agencyiq">
          <CardContent className="p-8">
            <h2 className="text-heading font-light text-foreground text-center mb-8 lowercase">
              log in to your account
            </h2>
            
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-sections">
              <div>
                <Label className="text-sm font-medium text-foreground lowercase">phone number</Label>
                <Input
                  type="tel"
                  placeholder="+61412345678"
                  {...form.register('phone')}
                  className="mt-2"
                />
                {form.formState.errors.phone && (
                  <p className="text-sm text-destructive mt-1">{form.formState.errors.phone.message}</p>
                )}
              </div>
              
              <div>
                <Label className="text-sm font-medium text-foreground lowercase">password</Label>
                <Input
                  type="password"
                  {...form.register('password')}
                  className="mt-2"
                />
                {form.formState.errors.password && (
                  <p className="text-sm text-destructive mt-1">{form.formState.errors.password.message}</p>
                )}
              </div>
              
              <Button
                type="submit"
                className="w-full btn-secondary"
                disabled={loading}
              >
                {loading ? 'logging in...' : 'log in'}
              </Button>
              
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => setShowForgotPassword(true)}
                  className="link-primary text-sm lowercase"
                >
                  forgot password?
                </button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>

      <Footer />
      <ForgotPasswordModal 
        isOpen={showForgotPassword}
        onClose={() => setShowForgotPassword(false)}
      />
    </div>
  );
}
