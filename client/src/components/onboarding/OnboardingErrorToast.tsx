import { useToast } from "@/hooks/use-toast";
import { AlertCircle, CheckCircle, Info, X } from "lucide-react";
import { useEffect } from "react";

interface OnboardingErrorToastProps {
  error?: string | null;
  success?: string | null;
  info?: string | null;
  onDismiss?: () => void;
  autoHide?: boolean;
  duration?: number;
}

export function OnboardingErrorToast({
  error,
  success,
  info,
  onDismiss,
  autoHide = true,
  duration = 5000
}: OnboardingErrorToastProps) {
  const { toast } = useToast();

  useEffect(() => {
    if (error) {
      toast({
        title: "Onboarding Error",
        description: error,
        variant: "destructive",
        action: onDismiss ? (
          <button
            onClick={onDismiss}
            className="inline-flex h-8 shrink-0 items-center justify-center rounded-md border bg-transparent px-3 text-sm font-medium ring-offset-background transition-colors hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          >
            <X className="h-4 w-4" />
          </button>
        ) : undefined,
      });
    }
  }, [error, toast, onDismiss]);

  useEffect(() => {
    if (success) {
      toast({
        title: "Success",
        description: success,
        variant: "default",
        className: "border-green-200 bg-green-50 text-green-800",
        action: onDismiss ? (
          <button
            onClick={onDismiss}
            className="inline-flex h-8 shrink-0 items-center justify-center rounded-md border bg-transparent px-3 text-sm font-medium ring-offset-background transition-colors hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          >
            <CheckCircle className="h-4 w-4" />
          </button>
        ) : undefined,
      });
    }
  }, [success, toast, onDismiss]);

  useEffect(() => {
    if (info) {
      toast({
        title: "Information",
        description: info,
        variant: "default",
        className: "border-blue-200 bg-blue-50 text-blue-800",
        action: onDismiss ? (
          <button
            onClick={onDismiss}
            className="inline-flex h-8 shrink-0 items-center justify-center rounded-md border bg-transparent px-3 text-sm font-medium ring-offset-background transition-colors hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          >
            <Info className="h-4 w-4" />
          </button>
        ) : undefined,
      });
    }
  }, [info, toast, onDismiss]);

  return null; // This component only triggers toasts, doesn't render anything
}

// Enhanced onboarding error handler hook
export function useOnboardingErrorHandler() {
  const { toast } = useToast();

  const handleValidationError = (errors: string[]) => {
    toast({
      title: "Validation Failed",
      description: (
        <div className="space-y-1">
          {errors.map((error, index) => (
            <div key={index} className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-500" />
              <span className="text-sm">{error}</span>
            </div>
          ))}
        </div>
      ),
      variant: "destructive",
    });
  };

  const handleNetworkError = (message?: string) => {
    toast({
      title: "Network Error",
      description: message || "Unable to connect to the server. Please check your internet connection and try again.",
      variant: "destructive",
      action: (
        <button
          onClick={() => window.location.reload()}
          className="inline-flex h-8 shrink-0 items-center justify-center rounded-md border bg-transparent px-3 text-sm font-medium ring-offset-background transition-colors hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
        >
          Retry
        </button>
      ),
    });
  };

  const handleTimeout = () => {
    toast({
      title: "Request Timeout",
      description: "The request took too long to complete. Please try again.",
      variant: "destructive",
    });
  };

  const handleOTPError = (type: 'phone' | 'email') => {
    toast({
      title: `${type === 'phone' ? 'SMS' : 'Email'} Verification Error`,
      description: `Unable to send ${type === 'phone' ? 'SMS' : 'email'} verification. Please check your ${type === 'phone' ? 'phone number' : 'email address'} and try again.`,
      variant: "destructive",
    });
  };

  const handleSuccess = (message: string) => {
    toast({
      title: "Success",
      description: message,
      className: "border-green-200 bg-green-50 text-green-800",
    });
  };

  const handleInfo = (message: string) => {
    toast({
      title: "Information",
      description: message,
      className: "border-blue-200 bg-blue-50 text-blue-800",
    });
  };

  return {
    handleValidationError,
    handleNetworkError,
    handleTimeout,
    handleOTPError,
    handleSuccess,
    handleInfo,
  };
}