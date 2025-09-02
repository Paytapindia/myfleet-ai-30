import { supabase } from '@/integrations/supabase/client';

export interface SendOtpResponse {
  success: boolean;
  message: string;
}

export interface VerifyOtpResponse {
  success: boolean;
  message: string;
}

export const phoneVerificationService = {
  async sendOtp(phoneNumber: string): Promise<SendOtpResponse> {
    try {
      const { data, error } = await supabase.functions.invoke('msg91-send-otp', {
        body: {
          mobile: phoneNumber,
          name: 'User',
          expiryMinutes: 5
        }
      });

      if (error) {
        console.error('Error sending OTP:', error);
        return { success: false, message: 'Failed to send OTP. Please try again.' };
      }

      return { success: true, message: 'OTP sent successfully' };
    } catch (error) {
      console.error('Exception sending OTP:', error);
      return { success: false, message: 'Failed to send OTP. Please try again.' };
    }
  },

  async verifyOtp(phoneNumber: string, otp: string): Promise<VerifyOtpResponse> {
    try {
      const { data, error } = await supabase.functions.invoke('msg91-verify-otp', {
        body: {
          mobile: phoneNumber,
          otp: otp
        }
      });

      if (error) {
        console.error('Error verifying OTP:', error);
        return { success: false, message: 'Invalid OTP. Please try again.' };
      }

      if (data?.success) {
        // Update phone verification status in profiles table
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { error: updateError } = await supabase
            .from('profiles')
            .update({ phone_verified: true })
            .eq('user_id', user.id);

          if (updateError) {
            console.error('Error updating phone verification status:', updateError);
            return { success: false, message: 'Verification failed. Please try again.' };
          }
        }

        return { success: true, message: 'Phone number verified successfully' };
      } else {
        return { success: false, message: 'Invalid OTP. Please try again.' };
      }
    } catch (error) {
      console.error('Exception verifying OTP:', error);
      return { success: false, message: 'Verification failed. Please try again.' };
    }
  }
};