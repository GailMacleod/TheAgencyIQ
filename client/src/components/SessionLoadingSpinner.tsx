/**
 * Session Loading Spinner Component
 * Provides visual feedback during session establishment
 */

import { Loader2, AlertCircle, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface SessionLoadingSpinnerProps {
  isEstablishing: boolean;
  isError: boolean;
  error?: string | null;
  onRetry?: () => void;
  showCard?: boolean;
}

export default function SessionLoadingSpinner({
  isEstablishing,
  isError,
  error,
  onRetry,
  showCard = true
}: SessionLoadingSpinnerProps) {
  if (!isEstablishing && !isError) {
    return null;
  }

  const content = (
    <div className="flex flex-col items-center justify-center space-y-4 p-6">
      {isEstablishing && (
        <>
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          <div className="text-center">
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
              Establishing Session
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Connecting to secure authentication...
            </p>
          </div>
        </>
      )}

      {isError && (
        <>
          <AlertCircle className="h-8 w-8 text-red-500" />
          <div className="text-center">
            <p className="text-sm font-medium text-red-600 dark:text-red-400">
              Session Error
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {error || 'Failed to establish secure session'}
            </p>
          </div>
          {onRetry && (
            <Button
              onClick={onRetry}
              variant="outline"
              size="sm"
              className="mt-2"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Retry Connection
            </Button>
          )}
        </>
      )}
    </div>
  );

  if (!showCard) {
    return content;
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
      <Card className="w-full max-w-md mx-4">
        <CardContent className="p-0">
          {content}
        </CardContent>
      </Card>
    </div>
  );
}