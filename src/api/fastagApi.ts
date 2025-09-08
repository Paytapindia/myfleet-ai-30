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
  dataAge?: string; // Added for Phase 4: Show data age in UI
}

export const verifyFastag = async (vehicleNumber: string, forceRefresh = false, retryCount = 0): Promise<FastagVerificationResponse> => {
  const maxRetries = 1;
  
  try {
    console.log(`🏷️ [FASTag] Starting verification for ${vehicleNumber}, forceRefresh: ${forceRefresh}`);
    
    // Get user session for auth
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      return {
        success: false,
        error: 'Authentication required',
        details: 'Please log in to verify FASTag'
      };
    }

    // Step 1: Check for existing data in vehicles table (unless forcing refresh)
    if (!forceRefresh) {
      console.log(`🏷️ [FASTag] Checking database for existing data...`);
      
      const { data: vehicleData, error: dbError } = await supabase
        .from('vehicles')
        .select('fasttag_balance, fasttag_linked, fasttag_last_synced_at, number')
        .eq('number', vehicleNumber)
        .eq('user_id', session.user.id)
        .single();

      if (!dbError && vehicleData) {
        const lastSynced = vehicleData.fasttag_last_synced_at;
        const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
        
        // If we have recent data (within 30 minutes), return it
        if (lastSynced && new Date(lastSynced) > thirtyMinutesAgo) {
          console.log(`🏷️ [FASTag] Returning cached database data (synced: ${lastSynced})`);
          
          const dataAge = Math.floor((Date.now() - new Date(lastSynced).getTime()) / (1000 * 60));
          
          return {
            success: true,
            data: {
              balance: vehicleData.fasttag_balance || 0,
              linked: vehicleData.fasttag_linked || false,
              vehicleNumber: vehicleData.number
            },
            cached: true,
            verifiedAt: lastSynced,
            dataAge: `${dataAge} minutes ago`
          };
        }
      }
    }
    
    // Step 2: Fetch fresh data from edge function
    console.log(`🏷️ [FASTag] Calling edge function (attempt ${retryCount + 1})`);
    
    const { data, error } = await supabase.functions.invoke('vehicle-info', {
      body: {
        type: 'fastag',
        vehicleId: vehicleNumber
      },
      headers: {
        'Authorization': `Bearer ${session.access_token}`
      }
    });

    if (error) {
      console.error('🏷️ [FASTag] Edge function error:', error);
      
      // Retry on timeout or network errors
      if ((error.message?.includes('timeout') || error.message?.includes('network') || error.message?.includes('fetch')) && retryCount < maxRetries) {
        console.log(`🏷️ [FASTag] Retrying... (${retryCount + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, 2000));
        return verifyFastag(vehicleNumber, forceRefresh, retryCount + 1);
      }
      
      return {
        success: false,
        error: 'Failed to verify FASTag - This may take up to 30 seconds',
        details: error.message
      };
    }

    if (!data || !data.success) {
      console.error('🏷️ [FASTag] API returned error:', data);
      return {
        success: false,
        error: data?.error || 'FASTag verification failed'
      };
    }

    // Step 3: Query database again to get the freshly stored data
    console.log(`🏷️ [FASTag] Querying database for updated data...`);
    
    const { data: updatedVehicleData, error: finalDbError } = await supabase
      .from('vehicles')
      .select('fasttag_balance, fasttag_linked, fasttag_last_synced_at, number')
      .eq('number', vehicleNumber)
      .eq('user_id', session.user.id)
      .single();

    if (finalDbError || !updatedVehicleData) {
      console.error('🏷️ [FASTag] Failed to fetch updated database data:', finalDbError);
      return {
        success: false,
        error: 'Data update failed',
        details: 'Unable to retrieve updated FASTag information'
      };
    }

    console.log('🏷️ [FASTag] Returning fresh database data:', updatedVehicleData);

    return {
      success: true,
      data: {
        balance: updatedVehicleData.fasttag_balance || 0,
        linked: updatedVehicleData.fasttag_linked || false,
        vehicleNumber: updatedVehicleData.number
      },
      cached: false,
      verifiedAt: updatedVehicleData.fasttag_last_synced_at,
      dataAge: 'Just updated'
    };

  } catch (error: any) {
    console.error('🏷️ [FASTag] Unexpected error:', error);
    
    // Retry on timeout or network errors
    if ((error.message?.includes('timeout') || error.message?.includes('network') || error.message?.includes('fetch') || error.name === 'AbortError') && retryCount < maxRetries) {
      console.log(`🏷️ [FASTag] Retrying after error... (${retryCount + 1}/${maxRetries})`);
      await new Promise(resolve => setTimeout(resolve, 2000));
      return verifyFastag(vehicleNumber, forceRefresh, retryCount + 1);
    }
    
    return {
      success: false,
      error: 'Network timeout - Request may take up to 30 seconds',
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