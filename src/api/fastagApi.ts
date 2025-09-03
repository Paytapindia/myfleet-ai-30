import { supabase } from "@/integrations/supabase/client";

export interface FastagData {
  balance: number;
  linked: boolean;
  tagId?: string;
  status?: string;
  lastTransactionDate?: string;
  vehicleNumber: string;
  bankName?: string;
}

export interface FastagVerificationResponse {
  success: boolean;
  data?: FastagData;
  cached?: boolean;
  verifiedAt?: string;
  error?: string;
  details?: string;
}

export const verifyFastag = async (vehicleNumber: string, retryCount = 0): Promise<FastagVerificationResponse> => {
  const maxRetries = 1;
  
  try {
    console.log(`FASTag verification attempt ${retryCount + 1} for vehicle: ${vehicleNumber}`);
    
    const { data, error } = await supabase.functions.invoke('vehicle-info', {
      body: {
        type: 'fastag',
        vehicleId: vehicleNumber
      },
      headers: {
        'x-timeout': '15000' // 15 second timeout
      }
    });

    if (error) {
      console.error('FASTag verification error:', error);
      
      // Retry on timeout or network errors
      if ((error.message?.includes('timeout') || error.message?.includes('network') || error.message?.includes('fetch')) && retryCount < maxRetries) {
        console.log(`Retrying FASTag verification... (${retryCount + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2s before retry
        return verifyFastag(vehicleNumber, retryCount + 1);
      }
      
      return {
        success: false,
        error: 'Failed to verify FASTag - This may take up to 10 seconds',
        details: error.message
      };
    }

    return data;
  } catch (error: any) {
    console.error('FASTag API error:', error);
    
    // Retry on timeout or network errors
    if ((error.message?.includes('timeout') || error.message?.includes('network') || error.message?.includes('fetch') || error.name === 'AbortError') && retryCount < maxRetries) {
      console.log(`Retrying FASTag verification after error... (${retryCount + 1}/${maxRetries})`);
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2s before retry
      return verifyFastag(vehicleNumber, retryCount + 1);
    }
    
    return {
      success: false,
      error: 'Network timeout - Request takes up to 10 seconds',
      details: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

export const getFastagVerifications = async (vehicleNumber?: string) => {
  try {
    let query = supabase
      .from('fastag_verifications')
      .select('*')
      .order('created_at', { ascending: false });

    if (vehicleNumber) {
      query = query.eq('vehicle_number', vehicleNumber);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching FASTag verifications:', error);
      return { data: [], error };
    }

    return { data: data || [], error: null };
  } catch (error) {
    console.error('FASTag verifications fetch error:', error);
    return { data: [], error };
  }
};