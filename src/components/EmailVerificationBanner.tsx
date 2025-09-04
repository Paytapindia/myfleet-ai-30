import { useState } from 'react';
import { AlertTriangle, Mail, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { ProgressIndicator } from '@/components/ProgressIndicator';

export const EmailVerificationBanner = () => {
  const { resendVerificationEmail, session, user } = useAuth();
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

  // Progress steps for user journey
  const progressSteps = [
    {
      id: 'signup',
      title: 'Account Created',
      description: 'Successfully signed up',
      status: 'completed' as const
    },
    {
      id: 'email-verify',
      title: 'Email Verification',
      description: 'Click the link in your email',
      status: 'current' as const
    },
    {
      id: 'onboarding',
      title: 'Complete Profile',
      description: user?.isOnboarded ? 'Profile completed' : 'Add your details',
      status: user?.isOnboarded ? 'completed' as const : 'pending' as const
    },
    {
      id: 'subscription',
      title: 'Choose Plan',
      description: user?.subscribed ? 'Plan active' : 'Select subscription',
      status: user?.subscribed ? 'completed' as const : 'pending' as const
    }
  ];

  return (
    <div className="bg-gradient-to-r from-orange-50 to-yellow-50 border-l-4 border-orange-400 shadow-sm">
      <div className="p-4">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-start">
            <div className="flex-shrink-0 p-1 bg-orange-100 rounded-full mr-3 mt-0.5">
              <AlertTriangle className="h-4 w-4 text-orange-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-orange-900">
                Email verification required
              </h3>
              <p className="text-sm text-orange-800 mt-1">
                Please verify your email address to unlock all features and ensure account security.
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsDismissed(true)}
            className="text-orange-600 hover:text-orange-800 hover:bg-orange-100 p-1 rounded"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        {/* Progress Indicator */}
        <div className="mb-4 bg-white/50 p-3 rounded-lg">
          <h4 className="text-xs font-medium text-orange-900 mb-2">Setup Progress</h4>
          <ProgressIndicator steps={progressSteps} className="scale-90 -my-2" />
        </div>
        
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleResend}
            disabled={isResending}
            className="text-orange-800 border-orange-300 hover:bg-orange-100 bg-white/70 font-medium"
          >
            {isResending ? (
              <>
                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-orange-600 mr-2" />
                Sending...
              </>
            ) : (
              <>
                <Mail className="h-4 w-4 mr-2" />
                Resend verification email
              </>
            )}
          </Button>
          <span className="text-xs text-orange-700 bg-orange-100/50 px-2 py-1 rounded">
            Check your spam folder too
          </span>
        </div>
      </div>
    </div>
  );
};