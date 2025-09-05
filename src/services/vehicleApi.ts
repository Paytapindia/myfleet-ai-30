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
    
    // Transform the API response to our interface
    const vehicleData = data.data || data; // Handle both data.data and direct data structures
    console.log('Transformed vehicle data:', vehicleData);
    
    return {
      number: vehicleData.license_plate || vehicleData.number || vehicleNumber,
      model: vehicleData.vehicle_model || vehicleData.model || '',
      make: vehicleData.make || vehicleData.vehicle_make,
      year: vehicleData.year || vehicleData.year_of_manufacture,
      fuelType: vehicleData.fuel_type || vehicleData.fuelType,
      registrationDate: vehicleData.registration_date || vehicleData.registrationDate,
      ownerName: vehicleData.owner_name || vehicleData.ownerName,
      chassisNumber: vehicleData.chassis_no || vehicleData.chassisNumber,
      engineNumber: vehicleData.engine_no || vehicleData.engineNumber,
      registrationAuthority: vehicleData.registration_authority || vehicleData.registrationAuthority,
      fitnessExpiry: vehicleData.fitness_valid_upto || vehicleData.fitnessExpiry,
      puccExpiry: vehicleData.pucc_valid_upto || vehicleData.puccExpiry,
      insuranceExpiry: vehicleData.insurance_valid_upto || vehicleData.insuranceExpiry,
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