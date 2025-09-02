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

export const verifyFastag = async (vehicleNumber: string): Promise<FastagVerificationResponse> => {
  try {
    const { data, error } = await supabase.functions.invoke('fastag-verification', {
      body: { vehicleNumber }
    });

    if (error) {
      console.error('FASTag verification error:', error);
      return {
        success: false,
        error: 'Failed to verify FASTag',
        details: error.message
      };
    }

    return data;
  } catch (error) {
    console.error('FASTag API error:', error);
    return {
      success: false,
      error: 'Network error occurred',
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