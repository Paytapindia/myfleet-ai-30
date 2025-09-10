import { supabase } from "@/integrations/supabase/client";
import { directApi } from "@/services/directApi";

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

export const fetchVehicleDetails = async (vehicleNumber: string, forceRefresh = false, retryCount = 0): Promise<VehicleApiResponse> => {
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

    console.log(`🚗 [fetchVehicleDetails] Starting fetch for: ${vehicleNumber}, forceRefresh: ${forceRefresh}`);

    // Step 1: Check if we have cached data in vehicles table (unless forced refresh)
    if (!forceRefresh) {
      console.log('🚗 [fetchVehicleDetails] Checking vehicles table for cached data...');
      
      const { data: vehicleData, error: dbError } = await supabase
        .from('vehicles')
        .select('*')
        .eq('number', vehicleNumber)
        .eq('user_id', session.user.id)
        .maybeSingle();

      if (dbError) {
        console.error('🚗 [fetchVehicleDetails] Database query error:', dbError);
      } else if (vehicleData) {
        console.log('🚗 [fetchVehicleDetails] Found vehicle in database:', vehicleData);
        
        // Check if data is fresh (less than 24 hours old)
        const lastRefresh = (vehicleData as any).last_rc_refresh ? new Date((vehicleData as any).last_rc_refresh) : null;
        const isDataFresh = lastRefresh && (Date.now() - lastRefresh.getTime()) < 24 * 60 * 60 * 1000;
        
        console.log('🚗 [fetchVehicleDetails] Data freshness check:', { lastRefresh, isDataFresh });
        
        if (isDataFresh && vehicleData.chassis_number && vehicleData.engine_number) {
          console.log('🚗 [fetchVehicleDetails] Using cached data from database');
          
          // Return cached data from database
          return {
            number: vehicleData.number,
            model: vehicleData.model || (vehicleData as any).brand_model || '',
            make: vehicleData.make || (vehicleData as any).brand_name,
            year: vehicleData.year?.toString(),
            fuelType: vehicleData.fuel_type,
            registrationDate: vehicleData.registration_date,
            ownerName: vehicleData.owner_name,
            chassisNumber: vehicleData.chassis_number,
            engineNumber: vehicleData.engine_number,
            registrationAuthority: vehicleData.registration_authority,
            fitnessExpiry: (vehicleData as any).fit_up_to,
            puccExpiry: vehicleData.pollution_expiry,
            insuranceExpiry: vehicleData.insurance_expiry,
            success: true,
            cached: true
          };
        } else {
          console.log('🚗 [fetchVehicleDetails] Cached data is stale or incomplete, fetching fresh data...');
        }
      } else {
        console.log('🚗 [fetchVehicleDetails] No vehicle found in database, fetching from API...');
      }
    }

    // Step 2: Fetch fresh data from API Gateway
    console.log(`🚗 [fetchVehicleDetails] Calling API Gateway (attempt ${retryCount + 1})`);

    const data = await directApi.verifyRC(vehicleNumber, forceRefresh);

    if (!data.success) {
      console.error('🚗 [fetchVehicleDetails] API Gateway error:', data.error);
      
      // Retry on timeout or network errors
      if ((data.error?.includes('timeout') || data.error?.includes('network') || data.error?.includes('fetch')) && retryCount < maxRetries) {
        console.log(`🚗 [fetchVehicleDetails] Retrying... (${retryCount + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, 2000));
        return fetchVehicleDetails(vehicleNumber, forceRefresh, retryCount + 1);
      }
      
      return {
        number: vehicleNumber,
        model: '',
        success: false,
        error: data.error || 'Failed to fetch vehicle details - This may take up to 10 seconds'
      };
    }

    console.log('🚗 [fetchVehicleDetails] API Gateway response:', data);

    // Extract vehicle data from API response
    const apiVehicleData = data.data;
    console.log('🚗 [fetchVehicleDetails] Processed vehicle data:', apiVehicleData);
    
    // Step 3: Update the vehicles table with fresh data
    console.log('🚗 [fetchVehicleDetails] Updating vehicles table with fresh data...');
    
    const updateData = {
      model: apiVehicleData.model || '',
      make: apiVehicleData.make,
      brand_name: apiVehicleData.make,
      brand_model: apiVehicleData.model,
      year: apiVehicleData.year || null,
      fuel_type: apiVehicleData.fuelType,
      registration_date: apiVehicleData.registrationDate,
      owner_name: apiVehicleData.ownerName,
      chassis_number: apiVehicleData.chassisNumber,
      engine_number: apiVehicleData.engineNumber,
      registration_authority: apiVehicleData.registrationAuthority,
      rc_verified_at: new Date().toISOString(),
      last_rc_refresh: new Date().toISOString(),
      rc_verification_status: 'verified'
      // Removed rc_data_complete as it's a generated column
    };

    const { error: updateError } = await supabase
      .from('vehicles')
      .upsert({
        number: vehicleNumber,
        user_id: session.user.id,
        ...updateData
      }, {
        onConflict: 'number,user_id'
      });

    if (updateError) {
      console.error('🚗 [fetchVehicleDetails] Failed to update vehicles table:', updateError);
      
      // Fallback: return API data if DB update fails
      return {
        number: apiVehicleData.number || vehicleNumber,
        model: apiVehicleData.model || '',
        make: apiVehicleData.make,
        year: apiVehicleData.year?.toString(),
        fuelType: apiVehicleData.fuelType,
        registrationDate: apiVehicleData.registrationDate,
        ownerName: apiVehicleData.ownerName,
        chassisNumber: apiVehicleData.chassisNumber,
        engineNumber: apiVehicleData.engineNumber,
        registrationAuthority: apiVehicleData.registrationAuthority,
        fitnessExpiry: undefined,
        puccExpiry: undefined,
        insuranceExpiry: undefined,
        success: true,
        cached: false
      };
    }

    console.log('🚗 [fetchVehicleDetails] Successfully updated vehicles table');
    
    // Step 4: Query the database again to get the freshly stored data
    console.log('🚗 [fetchVehicleDetails] Querying database for freshly stored data...');
    
    const { data: freshVehicleData, error: queryError } = await supabase
      .from('vehicles')
      .select('*')
      .eq('number', vehicleNumber)
      .eq('user_id', session.user.id)
      .single();

    if (queryError || !freshVehicleData) {
      console.error('🚗 [fetchVehicleDetails] Failed to query freshly stored data:', queryError);
      
      // Fallback: return API data if query fails
      return {
        number: apiVehicleData.number || vehicleNumber,
        model: apiVehicleData.model || '',
        make: apiVehicleData.make,
        year: apiVehicleData.year?.toString(),
        fuelType: apiVehicleData.fuelType,
        registrationDate: apiVehicleData.registrationDate,
        ownerName: apiVehicleData.ownerName,
        chassisNumber: apiVehicleData.chassisNumber,
        engineNumber: apiVehicleData.engineNumber,
        registrationAuthority: apiVehicleData.registrationAuthority,
        fitnessExpiry: undefined,
        puccExpiry: undefined,
        insuranceExpiry: undefined,
        success: true,
        cached: false
      };
    }

    console.log('🚗 [fetchVehicleDetails] Returning freshly stored database data');
    
    // Return the freshly stored database data for consistency
    return {
      number: freshVehicleData.number,
      model: freshVehicleData.model || '',
      make: freshVehicleData.make,
      year: freshVehicleData.year?.toString(),
      fuelType: freshVehicleData.fuel_type,
      registrationDate: freshVehicleData.registration_date,
      ownerName: freshVehicleData.owner_name,
      chassisNumber: freshVehicleData.chassis_number,
      engineNumber: freshVehicleData.engine_number,
      registrationAuthority: freshVehicleData.registration_authority,
      fitnessExpiry: (freshVehicleData as any).fit_up_to,
      puccExpiry: freshVehicleData.pollution_expiry,
      insuranceExpiry: freshVehicleData.insurance_expiry,
      success: true,
      cached: false
    };
    
  } catch (error: any) {
    console.error('🚗 [fetchVehicleDetails] Unexpected error:', error);
    
    // Retry on timeout or network errors
    if ((error.message?.includes('timeout') || error.message?.includes('network') || error.message?.includes('fetch') || error.name === 'AbortError') && retryCount < maxRetries) {
      console.log(`🚗 [fetchVehicleDetails] Retrying after error... (${retryCount + 1}/${maxRetries})`);
      await new Promise(resolve => setTimeout(resolve, 2000));
      return fetchVehicleDetails(vehicleNumber, forceRefresh, retryCount + 1);
    }
    
    return {
      number: vehicleNumber,
      model: '',
      success: false,
      error: error instanceof Error ? error.message : 'Network timeout - Request takes up to 10 seconds'
    };
  }
};