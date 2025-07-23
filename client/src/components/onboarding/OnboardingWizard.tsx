import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { useMutation } from '@tanstack/react-query';
import { useSessionHook } from '@/hooks/useSessionHook';

export default function OnboardingWizard() {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
    businessName: '',
    businessType: '',
    industry: '',
    subscriptionPlan: 'starter'
  });
  const [verificationCode, setVerificationCode] = useState('');
  const { toast } = useToast();

  // FIXED: Show wizard if !session.established or !localStorage 'onboarding-complete'
  const { sessionEstablished, onboardingComplete } = useSessionHook();
  
  // Don't show wizard if session is established and onboarding is complete
  if (sessionEstablished && onboardingComplete) {
    return null;
  }

  const validateDataMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest('/api/onboarding/validate', {
        method: 'POST',
        body: JSON.stringify(data),
        headers: { 'Content-Type': 'application/json' }
      });
    },
    onSuccess: () => {
      toast({
        title: "Data Validated",
        description: "Your information looks good. Let's verify your phone number.",
      });
      setCurrentStep(2);
    },
    onError: (error: any) => {
      toast({
        title: "Validation Error",
        description: error.message || "Please check your information and try again.",
        variant: "destructive",
      });
    },
  });

  const sendOTPMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('/api/onboarding/send-phone-otp', {
        method: 'POST',
        body: JSON.stringify({ phoneNumber: formData.phoneNumber }),
        headers: { 'Content-Type': 'application/json' }
      });
    },
    onSuccess: () => {
      toast({
        title: "OTP Sent",
        description: "Check your phone for the verification code.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "OTP Send Failed",
        description: error.message || "Failed to send verification code.",
        variant: "destructive",
      });
    },
  });

  const verifyOTPMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('/api/onboarding/verify-phone-otp', {
        method: 'POST',
        body: JSON.stringify({ 
          phoneNumber: formData.phoneNumber, 
          code: verificationCode 
        }),
        headers: { 'Content-Type': 'application/json' }
      });
    },
    onSuccess: () => {
      toast({
        title: "Phone Verified",
        description: "Phone verification successful. Sending email verification...",
      });
      setCurrentStep(3);
      sendEmailVerification();
    },
    onError: (error: any) => {
      toast({
        title: "Verification Failed",
        description: error.message || "Invalid verification code.",
        variant: "destructive",
      });
    },
  });

  const sendEmailVerification = async () => {
    try {
      await apiRequest('/api/onboarding/send-email-verification', {
        method: 'POST',
        body: JSON.stringify({ 
          email: formData.email, 
          firstName: formData.firstName 
        }),
        headers: { 'Content-Type': 'application/json' }
      });
      
      toast({
        title: "Email Sent",
        description: "Check your email for the verification link.",
      });
    } catch (error: any) {
      toast({
        title: "Email Send Failed",
        description: error.message || "Failed to send verification email.",
        variant: "destructive",
      });
    }
  };

  const completeOnboardingMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('/api/onboarding/complete', {
        method: 'POST',
        body: JSON.stringify(formData),
        headers: { 'Content-Type': 'application/json' }
      });
    },
    onSuccess: () => {
      // Set localStorage flag for onboarding completion
      localStorage.setItem('onboarding-complete', 'true');
      
      toast({
        title: "Welcome to TheAgencyIQ!",
        description: "Your account has been created successfully.",
      });
      
      // Redirect to dashboard
      window.location.href = '/dashboard';
    },
    onError: (error: any) => {
      // FIXED: Guest mode if auth fails
      enableGuestMode();
    },
  });

  const enableGuestMode = async () => {
    try {
      const result = await apiRequest('/api/onboarding/guest-mode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      toast({
        title: "Guest Access Enabled",
        description: "You have limited access. Some features may be restricted.",
        variant: "default",
      });

      // Redirect to dashboard with guest access
      window.location.href = '/dashboard?guest=true';

    } catch (error: any) {
      toast({
        title: "Access Failed",
        description: "Unable to provide access. Please try again later.",
        variant: "destructive",
      });
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Welcome to TheAgencyIQ</CardTitle>
          <CardDescription>
            AI-powered social media automation for Queensland SMEs
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {currentStep === 1 && (
            <>
              <div className="space-y-3">
                <Input
                  placeholder="First Name"
                  value={formData.firstName}
                  onChange={(e) => handleInputChange('firstName', e.target.value)}
                />
                <Input
                  placeholder="Last Name"
                  value={formData.lastName}
                  onChange={(e) => handleInputChange('lastName', e.target.value)}
                />
                <Input
                  type="email"
                  placeholder="Email Address"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                />
                <Input
                  placeholder="Phone Number (Australian)"
                  value={formData.phoneNumber}
                  onChange={(e) => handleInputChange('phoneNumber', e.target.value)}
                />
                <Input
                  placeholder="Business Name"
                  value={formData.businessName}
                  onChange={(e) => handleInputChange('businessName', e.target.value)}
                />
                <Input
                  placeholder="Industry"
                  value={formData.industry}
                  onChange={(e) => handleInputChange('industry', e.target.value)}
                />
              </div>
              <Button 
                onClick={() => validateDataMutation.mutate(formData)}
                disabled={validateDataMutation.isPending}
                className="w-full"
              >
                {validateDataMutation.isPending ? 'Validating...' : 'Continue'}
              </Button>
            </>
          )}

          {currentStep === 2 && (
            <>
              <div className="text-center space-y-4">
                <p className="text-sm text-gray-600">
                  We've sent a verification code to {formData.phoneNumber}
                </p>
                <Input
                  placeholder="Enter 6-digit code"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  maxLength={6}
                />
                <div className="flex gap-2">
                  <Button
                    onClick={() => sendOTPMutation.mutate()}
                    disabled={sendOTPMutation.isPending}
                    variant="outline"
                    className="flex-1"
                  >
                    {sendOTPMutation.isPending ? 'Sending...' : 'Resend Code'}
                  </Button>
                  <Button
                    onClick={() => verifyOTPMutation.mutate()}
                    disabled={verifyOTPMutation.isPending || verificationCode.length !== 6}
                    className="flex-1"
                  >
                    {verifyOTPMutation.isPending ? 'Verifying...' : 'Verify'}
                  </Button>
                </div>
              </div>
            </>
          )}

          {currentStep === 3 && (
            <>
              <div className="text-center space-y-4">
                <div className="text-green-600">
                  ✓ Phone number verified successfully
                </div>
                <p className="text-sm text-gray-600">
                  Please check your email ({formData.email}) and click the verification link to complete your registration.
                </p>
                <Button
                  onClick={() => completeOnboardingMutation.mutate()}
                  disabled={completeOnboardingMutation.isPending}
                  className="w-full"
                >
                  {completeOnboardingMutation.isPending ? 'Creating Account...' : 'Complete Registration'}
                </Button>
                <Button
                  onClick={enableGuestMode}
                  variant="outline"
                  className="w-full"
                >
                  Continue as Guest (Limited Access)
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}