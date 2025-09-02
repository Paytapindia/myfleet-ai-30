import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { useToast } from "@/hooks/use-toast";
import { phoneVerificationService } from "@/services/phoneVerificationService";
import { Loader2, Phone } from "lucide-react";

interface PhoneVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  phoneNumber: string;
  onVerificationSuccess: () => void;
}

export const PhoneVerificationModal = ({ 
  isOpen, 
  onClose, 
  phoneNumber, 
  onVerificationSuccess 
}: PhoneVerificationModalProps) => {
  const [otp, setOtp] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      // Send OTP when modal opens
      handleSendOtp();
    }
  }, [isOpen]);

  useEffect(() => {
    if (resendTimer > 0) {
      const interval = setInterval(() => {
        setResendTimer(prev => prev - 1);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [resendTimer]);

  const handleSendOtp = async () => {
    setIsSendingOtp(true);
    try {
      const result = await phoneVerificationService.sendOtp(phoneNumber);
      if (result.success) {
        toast({
          title: "OTP Sent",
          description: `Verification code sent to ${phoneNumber}`,
        });
        setResendTimer(60); // 60 second cooldown
      } else {
        toast({
          title: "Failed to Send OTP",
          description: result.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send OTP. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otp.length !== 6) {
      toast({
        title: "Invalid OTP",
        description: "Please enter the 6-digit verification code.",
        variant: "destructive",
      });
      return;
    }

    setIsVerifying(true);
    try {
      const result = await phoneVerificationService.verifyOtp(phoneNumber, otp);
      if (result.success) {
        toast({
          title: "Phone Verified",
          description: "Your phone number has been successfully verified.",
        });
        onVerificationSuccess();
        onClose();
      } else {
        toast({
          title: "Verification Failed",
          description: result.message,
          variant: "destructive",
        });
        setOtp(""); // Clear invalid OTP
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Verification failed. Please try again.",
        variant: "destructive",
      });
      setOtp("");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleClose = () => {
    setOtp("");
    setResendTimer(0);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Phone className="h-5 w-5" />
            <span>Verify Phone Number</span>
          </DialogTitle>
          <DialogDescription>
            Enter the 6-digit verification code sent to <span className="font-medium">{phoneNumber}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="flex justify-center">
            <InputOTP
              maxLength={6}
              value={otp}
              onChange={setOtp}
              disabled={isVerifying}
            >
              <InputOTPGroup>
                <InputOTPSlot index={0} />
                <InputOTPSlot index={1} />
                <InputOTPSlot index={2} />
                <InputOTPSlot index={3} />
                <InputOTPSlot index={4} />
                <InputOTPSlot index={5} />
              </InputOTPGroup>
            </InputOTP>
          </div>

          <div className="flex flex-col space-y-3">
            <Button
              onClick={handleVerifyOtp}
              disabled={isVerifying || otp.length !== 6}
              className="w-full"
            >
              {isVerifying ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Verifying...
                </>
              ) : (
                "Verify Phone Number"
              )}
            </Button>

            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Didn't receive the code?</span>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={handleSendOtp}
                disabled={isSendingOtp || resendTimer > 0}
              >
                {isSendingOtp ? (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin mr-1" />
                    Sending...
                  </>
                ) : resendTimer > 0 ? (
                  `Resend in ${resendTimer}s`
                ) : (
                  "Resend OTP"
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};