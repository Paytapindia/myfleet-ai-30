import { useCallback } from 'react';
import { directApi } from '@/services/directApi';
import { setAuthToken } from '@/api/appConfig';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export const useDirectApi = () => {
  const { user } = useAuth();

  // Set auth token whenever user changes
  const initializeAuth = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      setAuthToken(session.access_token);
    }
  }, []);

  const healthCheck = useCallback(async () => {
    await initializeAuth();
    return await directApi.healthCheck();
  }, [initializeAuth]);

  const verifyRC = useCallback(async (vehicleNumber: string, forceRefresh = false) => {
    await initializeAuth();
    return await directApi.verifyRC(vehicleNumber, forceRefresh);
  }, [initializeAuth]);

  const verifyFastag = useCallback(async (vehicleNumber: string, forceRefresh = false) => {
    await initializeAuth();
    return await directApi.verifyFastag(vehicleNumber, forceRefresh);
  }, [initializeAuth]);

  const verifyChallan = useCallback(async (
    vehicleNumber: string, 
    chassis: string, 
    engineNumber: string, 
    forceRefresh = false
  ) => {
    await initializeAuth();
    return await directApi.verifyChallan(vehicleNumber, chassis, engineNumber, forceRefresh);
  }, [initializeAuth]);

  const createVehicle = useCallback(async (vehicleData: {
    number: string;
    model?: string;
  }) => {
    await initializeAuth();
    if (!user?.id) throw new Error('User not authenticated');
    return await directApi.createVehicle({
      ...vehicleData,
      userId: user.id
    });
  }, [initializeAuth, user]);

  const updateVehicle = useCallback(async (vehicleId: string, updates: Record<string, any>) => {
    await initializeAuth();
    return await directApi.updateVehicle(vehicleId, updates);
  }, [initializeAuth]);

  const deleteVehicle = useCallback(async (vehicleId: string) => {
    await initializeAuth();
    return await directApi.deleteVehicle(vehicleId);
  }, [initializeAuth]);

  const assignDriver = useCallback(async (vehicleId: string, driverId: string) => {
    await initializeAuth();
    if (!user?.id) throw new Error('User not authenticated');
    return await directApi.assignDriver(vehicleId, driverId, user.id);
  }, [initializeAuth, user]);

  const unassignDriver = useCallback(async (vehicleId: string, driverId: string) => {
    await initializeAuth();
    return await directApi.unassignDriver(vehicleId, driverId);
  }, [initializeAuth]);

  return {
    healthCheck,
    verifyRC,
    verifyFastag,
    verifyChallan,
    createVehicle,
    updateVehicle,
    deleteVehicle,
    assignDriver,
    unassignDriver,
  };
};