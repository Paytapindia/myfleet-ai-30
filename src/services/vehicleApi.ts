import { supabase } from "@/integrations/supabase/client";

// Vehicle API service for fetching real RC verification data
export interface VehicleApiResponse {
  number: string;
  model: string;
  make?: string;
  year?: string;
  fuelType?: string;
  registrationDate?: string;
  ownerName?: string;
  chassisNumber?: string;
  engineNumber?: string;
  registrationAuthority?: string;
  fitnessExpiry?: string;
  puccExpiry?: string;
  insuranceExpiry?: string;
  success: boolean;
  error?: string;
  cached?: boolean;
}

export const fetchVehicleDetails = async (vehicleNumber: string, retryCount = 0): Promise<VehicleApiResponse> => {
  const maxRetries = 1;
  
  try {
    // Get the current session
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return {
        number: vehicleNumber,
        model: '',
        success: false,
        error: 'User not authenticated'
      };
    }

    console.log(`RC verification attempt ${retryCount + 1} for vehicle: ${vehicleNumber}`);

    // Call our unified Supabase Edge Function for RC verification
    const { data, error } = await supabase.functions.invoke('vehicle-info', {
      body: {
        type: 'rc',
        vehicleId: vehicleNumber
      },
      headers: {
        'Authorization': `Bearer ${session.access_token}`
      }
    });

    if (error) {
      console.error('RC verification error:', error);
      
      // Retry on timeout or network errors
      if ((error.message?.includes('timeout') || error.message?.includes('network') || error.message?.includes('fetch')) && retryCount < maxRetries) {
        console.log(`Retrying RC verification... (${retryCount + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2s before retry
        return fetchVehicleDetails(vehicleNumber, retryCount + 1);
      }
      
      return {
        number: vehicleNumber,
        model: '',
        success: false,
        error: error.message || 'Failed to fetch vehicle details - This may take up to 45 seconds'
      };
    }

    if (!data.success) {
      return {
        number: vehicleNumber,
        model: '',
        success: false,
        error: data.error || 'Verification failed'
      };
    }

    // Debug logging
    console.log('Raw edge function response:', data);
    
    // Use the standardized data structure from edge function
    const vehicleData = data.data;
    console.log('Vehicle data from edge function:', vehicleData);
    
    // Validate that we have the expected data structure
    if (!vehicleData) {
      throw new Error('No vehicle data received from server');
    }
    
    return {
      number: vehicleData.number || vehicleNumber,
      model: vehicleData.model || '',
      make: vehicleData.make || null,
      year: vehicleData.year || null,
      fuelType: vehicleData.fuelType || null,
      registrationDate: vehicleData.registrationDate || null,
      ownerName: vehicleData.ownerName || null,
      chassisNumber: vehicleData.chassisNumber || null,
      engineNumber: vehicleData.engineNumber || null,
      registrationAuthority: vehicleData.registrationAuthority || null,
      fitnessExpiry: vehicleData.fitnessExpiry || null,
      puccExpiry: vehicleData.puccExpiry || null,
      insuranceExpiry: vehicleData.insuranceExpiry || null,
      success: true,
      cached: data.cached || false
    };
    
  } catch (error: any) {
    console.error('Vehicle details fetch error:', error);
    
    // Retry on timeout or network errors
    if ((error.message?.includes('timeout') || error.message?.includes('network') || error.message?.includes('fetch') || error.name === 'AbortError') && retryCount < maxRetries) {
      console.log(`Retrying RC verification after error... (${retryCount + 1}/${maxRetries})`);
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2s before retry
      return fetchVehicleDetails(vehicleNumber, retryCount + 1);
    }
    
    return {
      number: vehicleNumber,
      model: '',
      success: false,
      error: error instanceof Error ? error.message : 'Network timeout - Request takes up to 45 seconds'
    };
  }
};