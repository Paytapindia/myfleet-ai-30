-- Add computed fields and functions for vehicle readiness
-- Add rc_data_complete computed column to vehicles table
ALTER TABLE public.vehicles 
ADD COLUMN rc_data_complete BOOLEAN 
GENERATED ALWAYS AS (
  chassis_number IS NOT NULL AND 
  engine_number IS NOT NULL AND 
  rc_verified_at IS NOT NULL AND
  rc_verification_status = 'verified'
) STORED;

-- Add last_rc_refresh timestamp to track when RC was last updated  
ALTER TABLE public.vehicles 
ADD COLUMN last_rc_refresh TIMESTAMP WITH TIME ZONE;

-- Create function to check vehicle readiness
CREATE OR REPLACE FUNCTION public.check_vehicle_readiness(p_vehicle_number TEXT, p_user_id UUID)
RETURNS JSON AS $$
DECLARE
  vehicle_record RECORD;
  result JSON;
BEGIN
  -- Get vehicle data
  SELECT 
    chassis_number,
    engine_number, 
    rc_verified_at,
    rc_verification_status,
    rc_data_complete,
    last_rc_refresh
  INTO vehicle_record
  FROM public.vehicles 
  WHERE number = p_vehicle_number AND user_id = p_user_id;
  
  IF NOT FOUND THEN
    result := json_build_object(
      'isReady', false,
      'hasRCData', false,
      'hasChassis', false,
      'hasEngine', false,
      'isRCVerified', false,
      'missingFields', ARRAY['Vehicle not found']
    );
  ELSE
    DECLARE
      missing_fields TEXT[] := '{}';
      has_chassis BOOLEAN := vehicle_record.chassis_number IS NOT NULL;
      has_engine BOOLEAN := vehicle_record.engine_number IS NOT NULL;
      is_rc_verified BOOLEAN := vehicle_record.rc_verified_at IS NOT NULL;
      has_rc_data BOOLEAN := has_chassis AND has_engine;
      is_ready BOOLEAN := has_rc_data AND is_rc_verified;
    BEGIN
      IF NOT is_rc_verified THEN
        missing_fields := array_append(missing_fields, 'RC verification pending');
      END IF;
      IF NOT has_chassis THEN
        missing_fields := array_append(missing_fields, 'Chassis number');
      END IF;
      IF NOT has_engine THEN
        missing_fields := array_append(missing_fields, 'Engine number');
      END IF;
      
      result := json_build_object(
        'isReady', is_ready,
        'hasRCData', has_rc_data,
        'hasChassis', has_chassis,
        'hasEngine', has_engine,
        'isRCVerified', is_rc_verified,
        'missingFields', missing_fields,
        'lastVerified', vehicle_record.rc_verified_at,
        'lastRefresh', vehicle_record.last_rc_refresh
      );
    END;
  END IF;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;