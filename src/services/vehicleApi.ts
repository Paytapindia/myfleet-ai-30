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

export const fetchVehicleDetails = async (vehicleNumber: string): Promise<VehicleApiResponse> => {
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

    console.log(`Fetching RC verification for vehicle: ${vehicleNumber}`);

    // Call our unified Supabase Edge Function for RC verification
    const { data, error } = await supabase.functions.invoke('vehicle-info', {
      body: { 
        type: 'rc',
        vehicleNumber 
      },
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
      }
    });

    if (error) {
      console.error('RC verification error:', error);
      return {
        number: vehicleNumber,
        model: '',
        success: false,
        error: error.message || 'Failed to fetch vehicle details'
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

    // Transform the API response to our interface
    const vehicleData = data.data;
    return {
      number: vehicleData.number || vehicleNumber,
      model: vehicleData.model || '',
      make: vehicleData.make,
      year: vehicleData.year,
      fuelType: vehicleData.fuelType,
      registrationDate: vehicleData.registrationDate,
      ownerName: vehicleData.ownerName,
      chassisNumber: vehicleData.chassisNumber,
      engineNumber: vehicleData.engineNumber,
      registrationAuthority: vehicleData.registrationAuthority,
      fitnessExpiry: vehicleData.fitnessExpiry,
      puccExpiry: vehicleData.puccExpiry,
      insuranceExpiry: vehicleData.insuranceExpiry,
      success: true,
      cached: data.cached || false
    };
    
  } catch (error) {
    console.error('Vehicle details fetch error:', error);
    return {
      number: vehicleNumber,
      model: '',
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch vehicle details'
    };
  }
};