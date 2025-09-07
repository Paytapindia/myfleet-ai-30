import { useState } from 'react';
import { AlertTriangle, Mail, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

export const EmailVerificationBanner = () => {
  const { resendVerificationEmail, session } = useAuth();
  const [isResending, setIsResending] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const { toast } = useToast();

  const handleResend = async () => {
    if (!session?.user?.email) return;
    
    setIsResending(true);
    console.log('Resending verification email to:', session.user.email);
    
    const { error } = await resendVerificationEmail(session.user.email);
    
    if (error) {
      toast({
        title: 'Failed to resend',
        description: error,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Email sent',
        description: 'Please check your inbox for the verification link',
      });
    }
    
    setIsResending(false);
  };

  if (isDismissed) return null;

  return (
    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
      <div className="flex items-start justify-between">
        <div className="flex items-start">
          <AlertTriangle className="h-5 w-5 text-yellow-400 mt-0.5 mr-3" />
          <div className="flex-1">
            <h3 className="text-sm font-medium text-yellow-800">
              Email verification required
            </h3>
            <p className="text-sm text-yellow-700 mt-1">
              Please verify your email address to access all features.
            </p>
            <div className="mt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleResend}
                disabled={isResending}
                className="text-yellow-800 border-yellow-300 hover:bg-yellow-100"
              >
                {isResending ? (
                  'Sending...'
                ) : (
                  <>
                    <Mail className="h-4 w-4 mr-2" />
                    Resend verification email
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsDismissed(true)}
          className="text-yellow-600 hover:text-yellow-800 p-1"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};