import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import MasterHeader from "@/components/master-header";
import MasterFooter from "@/components/master-footer";
import BackButton from "@/components/back-button";

const paymentSchema = z.object({
  cardNumber: z.string().min(16, "Card number must be 16 digits").max(19, "Invalid card number"),
  expiryDate: z.string().regex(/^(0[1-9]|1[0-2])\/\d{2}$/, "Enter MM/YY format"),
  cvc: z.string().min(3, "CVC must be 3 digits").max(4, "CVC must be 3-4 digits"),
  cardHolder: z.string().min(2, "Cardholder name required"),
});

type PaymentForm = z.infer<typeof paymentSchema>;

export default function Payment() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [isTestPayment, setIsTestPayment] = useState(false);
  const queryClient = useQueryClient();

  // Get current user data
  const { data: user, isLoading: isLoadingUser } = useQuery<{
    id: number;
    email: string;
    phone: string;
    subscriptionPlan: string;
    remainingPosts: number;
    totalPosts: number;
  }>({
    queryKey: ["/api/user"],
    retry: false,
  });

  const form = useForm<PaymentForm>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      cardNumber: "",
      expiryDate: "",
      cvc: "",
      cardHolder: "",
    },
  });

  const paymentMutation = useMutation({
    mutationFn: async (paymentData: PaymentForm) => {
      // Early intercept for test payment to prevent Stripe processing
      if (isTestPayment) {
        console.log('Mock payment successful for testuser@agencyiq.com with 4242424242424242 using password TestPass123!');
        
        // Update test user subscription state with 45 posts limit
        const response = await apiRequest("PUT", "/api/user/subscription", {
          subscriptionPlan: 'professional',
          subscriptions: {
            starter: true,
            growth: true,
            professional: true
          },
          remainingPosts: 45,
          totalPosts: 45,
          isTestMode: true
        });
        
        // Return early with mock success to completely bypass Stripe
        return { success: true, mock: true, ...(await response.json()) };
      }
      
      // Live payment flow for all other users/cards
      console.log('Live payment attempted with password TestPass123!');
      
      // Create Stripe checkout session for live payments
      const response = await apiRequest("POST", "/api/create-checkout-session", {
        priceId: "price_professional",
        successUrl: window.location.origin + "/subscription?success=true",
        cancelUrl: window.location.origin + "/payment?canceled=true"
      });
      
      const { url } = await response.json();
      window.location.href = url;
      return { success: true };
    },
    onSuccess: (data) => {
      if (user?.email === 'testuser@agencyiq.com') {
        // Invalidate user query to refresh subscription state
        queryClient.invalidateQueries({ queryKey: ["/api/user"] });
        
        toast({
          title: "Payment Successful",
          description: "Your subscription has been activated with full access to all tiers.",
        });
        
        setLocation("/subscription?success=true");
      }
    },
    onError: (error: any) => {
      console.error("Payment error:", error);
      toast({
        title: "Payment Failed",
        description: error.message || "Payment processing failed. Please try again.",
        variant: "destructive",
      });
    },
    onSettled: () => {
      setLoading(false);
    },
  });

  const onSubmit = async (data: PaymentForm) => {
    setLoading(true);
    try {
      await paymentMutation.mutateAsync(data);
    } catch (error) {
      console.error("Payment submission error:", error);
    }
  };

  if (isLoadingUser) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: '#f5f5f5' }}>
        <MasterHeader showUserMenu={true} />
        <div className="max-w-md mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">Loading...</div>
        </div>
        <MasterFooter />
      </div>
    );
  }

  if (!user) {
    setLocation("/login");
    return null;
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f5f5f5' }}>
      <MasterHeader showUserMenu={true} />
      
      <div className="max-w-md mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="mb-6">
          <BackButton to="/subscription" label="Back to Subscription" />
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-center">Payment Details</CardTitle>
            <p className="text-sm text-gray-600 text-center">
              Upgrade to Professional Plan
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <Label htmlFor="cardNumber">Card Number</Label>
                <Input
                  id="cardNumber"
                  {...form.register('cardNumber')}
                  placeholder="1234 5678 9012 3456"
                  maxLength={19}
                  onChange={(e) => {
                    // Format card number with spaces
                    const value = e.target.value.replace(/\s/g, '').replace(/(.{4})/g, '$1 ').trim();
                    e.target.value = value;
                    const cleanCardNumber = value.replace(/\s/g, '');
                    form.setValue('cardNumber', cleanCardNumber);
                    
                    // Check for test payment conditions and set flag
                    if (user?.email === 'testuser@agencyiq.com' && cleanCardNumber === '4242424242424242') {
                      console.log('Mock payment initiated for testuser@agencyiq.com with 4242424242424242 using password TestPass123!');
                      setIsTestPayment(true);
                    } else {
                      setIsTestPayment(false);
                    }
                  }}
                />
                {form.formState.errors.cardNumber && (
                  <p className="text-sm text-red-600 mt-1">
                    {form.formState.errors.cardNumber.message}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="expiryDate">Expiry Date</Label>
                  <Input
                    id="expiryDate"
                    {...form.register('expiryDate')}
                    placeholder="MM/YY"
                    maxLength={5}
                    onChange={(e) => {
                      // Format expiry date
                      let value = e.target.value.replace(/\D/g, '');
                      if (value.length >= 2) {
                        value = value.substring(0, 2) + '/' + value.substring(2, 4);
                      }
                      e.target.value = value;
                      form.setValue('expiryDate', value);
                    }}
                  />
                  {form.formState.errors.expiryDate && (
                    <p className="text-sm text-red-600 mt-1">
                      {form.formState.errors.expiryDate.message}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="cvc">CVC</Label>
                  <Input
                    id="cvc"
                    {...form.register('cvc')}
                    placeholder="123"
                    maxLength={4}
                    onChange={(e) => {
                      // Only allow numbers
                      e.target.value = e.target.value.replace(/\D/g, '');
                      form.setValue('cvc', e.target.value);
                    }}
                  />
                  {form.formState.errors.cvc && (
                    <p className="text-sm text-red-600 mt-1">
                      {form.formState.errors.cvc.message}
                    </p>
                  )}
                </div>
              </div>

              <div>
                <Label htmlFor="cardHolder">Cardholder Name</Label>
                <Input
                  id="cardHolder"
                  {...form.register('cardHolder')}
                  placeholder="John Doe"
                />
                {form.formState.errors.cardHolder && (
                  <p className="text-sm text-red-600 mt-1">
                    {form.formState.errors.cardHolder.message}
                  </p>
                )}
              </div>

              <div className="pt-4">
                <Button
                  type="submit"
                  className="w-full"
                  disabled={loading || paymentMutation.isPending}
                >
                  {loading || paymentMutation.isPending ? "Processing..." : "Complete Payment"}
                </Button>
              </div>
            </form>

            {user?.email === 'testuser@agencyiq.com' && (
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-xs text-blue-800">
                  Test Mode: Use card number 4242424242424242 for mock payment
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <MasterFooter />
    </div>
  );
}