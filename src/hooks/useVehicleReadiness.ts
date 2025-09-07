import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface VehicleReadiness {
  isReady: boolean;
  hasRCData: boolean;
  hasChassis: boolean;
  hasEngine: boolean;
  isRCVerified: boolean;
  missingFields: string[];
  lastVerified?: string;
}

export const useVehicleReadiness = (vehicleNumber: string) => {
  const [readiness, setReadiness] = useState<VehicleReadiness>({
    isReady: false,
    hasRCData: false,
    hasChassis: false,
    hasEngine: false,
    isRCVerified: false,
    missingFields: []
  });
  const [isLoading, setIsLoading] = useState(false);

  const checkReadiness = async () => {
    if (!vehicleNumber) {
      setReadiness({
        isReady: false,
        hasRCData: false,
        hasChassis: false,
        hasEngine: false,
        isRCVerified: false,
        missingFields: ['Vehicle number required']
      });
      return;
    }

    setIsLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      const { data: vehicle, error } = await supabase
        .from('vehicles')
        .select('chassis_number, engine_number, rc_verified_at, rc_verification_status, model')
        .eq('user_id', user.id)
        .eq('number', vehicleNumber)
        .single();

      if (error || !vehicle) {
        setReadiness({
          isReady: false,
          hasRCData: false,
          hasChassis: false,
          hasEngine: false,
          isRCVerified: false,
          missingFields: ['Vehicle not found']
        });
        return;
      }

      const hasChassis = Boolean(vehicle.chassis_number);
      const hasEngine = Boolean(vehicle.engine_number);
      const isRCVerified = Boolean(vehicle.rc_verified_at);
      const hasRCData = hasChassis && hasEngine;
      const isReady = hasRCData && isRCVerified;

      const missingFields: string[] = [];
      if (!isRCVerified) missingFields.push('RC verification pending');
      if (!hasChassis) missingFields.push('Chassis number');
      if (!hasEngine) missingFields.push('Engine number');

      setReadiness({
        isReady,
        hasRCData,
        hasChassis,
        hasEngine,
        isRCVerified,
        missingFields,
        lastVerified: vehicle.rc_verified_at
      });

    } catch (error) {
      console.error('Error checking vehicle readiness:', error);
      setReadiness({
        isReady: false,
        hasRCData: false,
        hasChassis: false,
        hasEngine: false,
        isRCVerified: false,
        missingFields: ['Failed to check vehicle status']
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkReadiness();
  }, [vehicleNumber]);

  return {
    readiness,
    isLoading,
    refresh: checkReadiness
  };
};