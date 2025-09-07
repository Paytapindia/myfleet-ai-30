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
  // Diagnostic fields
  requestPayloadSent?: any;
  bodyPreview?: string;
  upstreamStatus?: number;
  envKeyUsed?: string;
}

export const fetchVehicleDetails = async (vehicleNumber: string, retryCount = 0): Promise<VehicleApiResponse> => {
  const maxRetries = 1;
  
  // Normalize and validate vehicle number  
  const normalizedVehicleNumber = vehicleNumber?.trim()?.toUpperCase();
  if (!normalizedVehicleNumber) {
    return {
      number: vehicleNumber,
      model: '',
      success: false,
      error: 'Vehicle number is required'
    };
  }
  
  try {
    // Get the current session
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return {
        number: normalizedVehicleNumber,
        model: '',
        success: false,
        error: 'User not authenticated'
      };
    }

    console.log(`RC verification attempt ${retryCount + 1} for vehicle: ${normalizedVehicleNumber}`);

    // Call our unified Supabase Edge Function for RC verification
    console.log(`[vehicleApi] Calling vehicleinfo-api-club with payload:`, {
      service: 'rc',
      vehicleId: normalizedVehicleNumber
    });
    
    try {
      const { data, error } = await supabase.functions.invoke('vehicleinfo-api-club', {
        body: {
          service: 'rc',
          vehicleId: normalizedVehicleNumber
        },
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });
      
      console.log(`[vehicleApi] Edge function invoke completed:`, { data, error });
      
      if (error) {
        console.error('[vehicleApi] Edge function invocation error:', error);
        
        // Handle specific edge function errors
        if (error.message?.includes('Missing required parameters')) {
          console.log('Edge function parameter error, this might be a deployment issue');
          return {
            number: normalizedVehicleNumber,
            model: '',
            success: false,
            error: 'Service temporarily unavailable. Please try again.'
          };
        }
        
        // Retry on timeout or network errors
        if ((error.message?.includes('timeout') || error.message?.includes('network') || error.message?.includes('fetch')) && retryCount < maxRetries) {
          console.log(`Retrying RC verification... (${retryCount + 1}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2s before retry
          return fetchVehicleDetails(normalizedVehicleNumber, retryCount + 1);
        }
        
        return {
          number: normalizedVehicleNumber,
          model: '',
          success: false,  
          error: error.message || 'Failed to fetch vehicle details - This may take up to 45 seconds'
        };
      }

      if (!data) {
        return {
          number: normalizedVehicleNumber,
          model: '',
          success: false,
          error: 'No response data from edge function'
        };
      }

      if (!data.success) {
        const msg = (data as any).error || (data as any).details || (data as any).data?.error || 'Verification failed';
        return {
          number: normalizedVehicleNumber,
          model: '',
          success: false,
          error: msg,
          // Include diagnostic fields for failed requests
          requestPayloadSent: (data as any).requestPayloadSent,
          bodyPreview: (data as any).bodyPreview,
          upstreamStatus: (data as any).upstreamStatus,
          envKeyUsed: (data as any).envKeyUsed
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
        number: vehicleData.number || normalizedVehicleNumber,
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
      
    } catch (invokeError: any) {
      console.error('[vehicleApi] supabase.functions.invoke failed with exception:', invokeError);
      
      return {
        number: normalizedVehicleNumber,
        model: '',
        success: false,
        error: `Edge function invocation failed: ${invokeError.message || 'Unknown error'}`
      };
    }
    
  } catch (error: any) {
    console.error('Vehicle details fetch error:', error);
    
    // Retry on timeout or network errors
    if ((error.message?.includes('timeout') || error.message?.includes('network') || error.message?.includes('fetch') || error.name === 'AbortError') && retryCount < maxRetries) {
      console.log(`Retrying RC verification after error... (${retryCount + 1}/${maxRetries})`);
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2s before retry
      return fetchVehicleDetails(normalizedVehicleNumber, retryCount + 1);
    }
    
    return {
      number: normalizedVehicleNumber,
      model: '',
      success: false,
      error: error instanceof Error ? error.message : 'Network timeout - Request takes up to 45 seconds'
    };
  }
};