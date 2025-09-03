import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Vehicle, AddVehicleFormData } from '@/types/vehicle';
import { useAuth } from './AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { getInsuranceStatus } from '@/lib/utils';

interface VehicleContextType {
  vehicles: Vehicle[];
  addVehicle: (vehicleData: AddVehicleFormData) => Promise<void>;
  removeVehicle: (vehicleId: string) => Promise<void>;
  updateVehicle: (vehicleId: string, updates: Partial<Vehicle>) => Promise<void>;
  assignDriverToVehicle: (vehicleId: string, driverId: string) => Promise<void>;
  unassignDriverFromVehicle: (vehicleId: string, driverId: string) => Promise<void>;
  isLoading: boolean;
}

const VehicleContext = createContext<VehicleContextType | undefined>(undefined);

export const useVehicles = () => {
  const context = useContext(VehicleContext);
  if (!context) {
    throw new Error('useVehicles must be used within a VehicleProvider');
  }
  return context;
};

export const VehicleProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const mapVehicle = useCallback((row: any, driverName?: string): Vehicle => {
    return {
      id: row.id,
      number: row.number,
      model: row.model ?? 'Not specified',
      payTapBalance: Number(row.pay_tap_balance ?? 0),
      fastTagLinked: Boolean(row.fasttag_linked ?? false),
      driver: driverName ? { id: row.driver_id ?? '', name: driverName } : null,
      lastService: row.last_service_date ?? 'Not scheduled',
      gpsLinked: Boolean(row.gps_linked ?? false),
      challans: Number(row.challans_count ?? 0),
      documents: {
        pollution: { status: 'missing' },
        registration: { status: 'missing' },
        insurance: { 
          status: getInsuranceStatus(row.insurance_expiry),
          expiryDate: row.insurance_expiry 
        },
        license: { status: 'missing' },
      },
      financialData: [],
      userId: row.user_id,
      // RC verification data
      ownerName: row.owner_name,
      chassisNumber: row.chassis_number,
      engineNumber: row.engine_number,
      fuelType: row.fuel_type,
      registrationDate: row.registration_date,
      registrationAuthority: row.registration_authority,
      permanentAddress: row.permanent_address,
      financer: row.financer,
      isFinanced: row.is_financed,
      rcVerifiedAt: row.rc_verified_at,
      rcVerificationStatus: row.rc_verification_status,
      make: row.make,
      year: row.year,
    } as Vehicle;
  }, []);

  const refreshVehicles = useCallback(async () => {
    if (!user) {
      setVehicles([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);

    const { data: vRows, error: vErr } = await supabase
      .from('vehicles')
      .select('*')
      .order('created_at', { ascending: false });

    if (vErr) {
      console.error('Failed to load vehicles:', vErr);
      setVehicles([]);
      setIsLoading(false);
      return;
    }

    const vehicleIds = (vRows ?? []).map(r => r.id);
    let assignmentsMap = new Map<string, { driver_id: string; driver_name?: string }>();

    if (vehicleIds.length > 0) {
      const { data: aRows, error: aErr } = await supabase
        .from('vehicle_assignments')
        .select('vehicle_id, driver_id, drivers(name)')
        .eq('is_active', true)
        .in('vehicle_id', vehicleIds);

      if (!aErr && aRows) {
        aRows.forEach((a: any) => {
          assignmentsMap.set(a.vehicle_id, { driver_id: a.driver_id, driver_name: a.drivers?.name });
        });
      }
    }

    const mapped = (vRows ?? []).map(r => {
      const info = assignmentsMap.get(r.id);
      return mapVehicle({ ...r, driver_id: info?.driver_id }, info?.driver_name);
    });

    setVehicles(mapped);
    setIsLoading(false);
  }, [user, mapVehicle]);

  useEffect(() => {
    refreshVehicles();
  }, [refreshVehicles]);

  const addVehicle = async (vehicleData: AddVehicleFormData) => {
    if (!user) return;
    setIsLoading(true);

    try {
      // First, add the basic vehicle record
      const { data: newVehicle, error: vehicleError } = await supabase
        .from('vehicles')
        .insert({
          user_id: user.id,
          number: vehicleData.number,
          model: 'Not specified',
          pay_tap_balance: 0,
          fasttag_linked: false,
          gps_linked: false,
          challans_count: 0,
          rc_verification_status: 'pending'
        })
        .select()
        .single();

      if (vehicleError) {
        console.error('Failed to add vehicle:', vehicleError);
        throw vehicleError;
      }

      // Trigger RC verification to fetch and cache vehicle details
      try {
        const { data: rcData, error: rcError } = await supabase.functions.invoke('rc-verification', {
          body: { vehicleNumber: vehicleData.number }
        });

        if (rcError) {
          console.error('RC verification failed:', rcError);
          // Don't throw error here - vehicle was already added successfully
        } else if (rcData?.success) {
          console.log('RC verification completed:', rcData.cached ? 'from cache' : 'fresh API call');
        }
      } catch (rcError) {
        console.error('RC verification error:', rcError);
        // Don't throw error here - vehicle was already added successfully
      }

      await refreshVehicles();
    } catch (error) {
      console.error('Failed to add vehicle:', error);
      throw error;
    }
  };

  const removeVehicle = async (vehicleId: string) => {
    setIsLoading(true);
    const { error } = await supabase.from('vehicles').delete().eq('id', vehicleId);
    if (error) console.error('Failed to remove vehicle:', error);
    await refreshVehicles();
  };

  const updateVehicle = async (vehicleId: string, updates: Partial<Vehicle>) => {
    setIsLoading(true);
    const payload: any = {};
    if (updates.model !== undefined) payload.model = updates.model;
    if (updates.gpsLinked !== undefined) payload.gps_linked = updates.gpsLinked;
    if (updates.fastTagLinked !== undefined) payload.fasttag_linked = updates.fastTagLinked;
    if (updates.payTapBalance !== undefined) payload.pay_tap_balance = updates.payTapBalance;
    if (updates.challans !== undefined) payload.challans_count = updates.challans;

    const { error } = await supabase.from('vehicles').update(payload).eq('id', vehicleId);
    if (error) console.error('Failed to update vehicle:', error);
    await refreshVehicles();
  };

  const assignDriverToVehicle = async (vehicleId: string, driverId: string) => {
    if (!user) return;
    setIsLoading(true);

    // Deactivate existing active assignment for this vehicle
    await supabase
      .from('vehicle_assignments')
      .update({ is_active: false, unassigned_at: new Date().toISOString() })
      .eq('vehicle_id', vehicleId)
      .eq('is_active', true);

    // Create new assignment
    const { error } = await supabase.from('vehicle_assignments').insert({
      user_id: user.id,
      vehicle_id: vehicleId,
      driver_id: driverId,
      is_active: true,
    });
    if (error) console.error('Failed to assign driver:', error);

    await refreshVehicles();
  };

  const unassignDriverFromVehicle = async (vehicleId: string, driverId: string) => {
    setIsLoading(true);
    const { error } = await supabase
      .from('vehicle_assignments')
      .update({ is_active: false, unassigned_at: new Date().toISOString() })
      .eq('vehicle_id', vehicleId)
      .eq('driver_id', driverId)
      .eq('is_active', true);
    if (error) console.error('Failed to unassign driver:', error);
    await refreshVehicles();
  };

  return (
    <VehicleContext.Provider
      value={{
        vehicles,
        addVehicle,
        removeVehicle,
        updateVehicle,
        assignDriverToVehicle,
        unassignDriverFromVehicle,
        isLoading,
      }}
    >
      {children}
    </VehicleContext.Provider>
  );
};