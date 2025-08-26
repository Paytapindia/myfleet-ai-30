import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Driver, AddDriverFormData } from '@/types/driver';
import { useAuth } from './AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface DriverContextType {
  drivers: Driver[];
  addDriver: (driverData: AddDriverFormData) => Promise<Driver>;
  updateDriver: (driverId: string, updates: Partial<Driver>) => Promise<void>;
  removeDriver: (driverId: string) => Promise<void>;
  getDriversByUser: (userId: string) => Driver[];
  assignDriverToVehicle: (driverId: string, vehicleId: string) => Promise<void>;
  unassignDriverFromVehicle: (driverId: string, vehicleId: string) => Promise<void>;
  getDriverById: (driverId: string) => Driver | undefined;
  isLoading: boolean;
}

const DriverContext = createContext<DriverContextType | undefined>(undefined);

export const useDrivers = () => {
  const context = useContext(DriverContext);
  if (!context) {
    throw new Error('useDrivers must be used within a DriverProvider');
  }
  return context;
};

export const DriverProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const mapDriver = useCallback((row: any, assignedVehicles: string[] = []): Driver => {
    return {
      id: row.id,
      name: row.name,
      licenseNumber: row.license_number,
      dateOfBirth: row.date_of_birth ?? '',
      phone: row.phone ?? undefined,
      address: row.address ?? undefined,
      userId: row.user_id,
      createdAt: row.created_at ?? new Date().toISOString(),
      assignedVehicles,
    } as Driver;
  }, []);

  const refreshDrivers = useCallback(async () => {
    if (!user) {
      setDrivers([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);

    const { data: dRows, error: dErr } = await supabase
      .from('drivers')
      .select('*')
      .order('created_at', { ascending: false });

    if (dErr) {
      console.error('Failed to load drivers:', dErr);
      setDrivers([]);
      setIsLoading(false);
      return;
    }

    const driverIds = (dRows ?? []).map(r => r.id);
    let vehicleIdsByDriver = new Map<string, string[]>();

    if (driverIds.length > 0) {
      const { data: aRows, error: aErr } = await supabase
        .from('vehicle_assignments')
        .select('vehicle_id, driver_id')
        .eq('is_active', true)
        .in('driver_id', driverIds);

      if (!aErr && aRows) {
        aRows.forEach((a: any) => {
          const arr = vehicleIdsByDriver.get(a.driver_id) ?? [];
          arr.push(a.vehicle_id);
          vehicleIdsByDriver.set(a.driver_id, arr);
        });
      }
    }

    const mapped = (dRows ?? []).map(r => mapDriver(r, vehicleIdsByDriver.get(r.id) ?? []));
    setDrivers(mapped);
    setIsLoading(false);
  }, [user, mapDriver]);

  useEffect(() => {
    refreshDrivers();
  }, [refreshDrivers]);

  const addDriver = async (driverData: AddDriverFormData): Promise<Driver> => {
    if (!user) throw new Error('User must be logged in to add driver');
    setIsLoading(true);

    const { data, error } = await supabase
      .from('drivers')
      .insert({
        user_id: user.id,
        name: driverData.name,
        phone: driverData.phone ?? null,
        license_number: driverData.licenseNumber,
        date_of_birth: driverData.dateOfBirth || null,
        status: 'active',
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to add driver:', error);
      throw error;
    }

    await refreshDrivers();
    return mapDriver(data!);
  };

  const updateDriver = async (driverId: string, updates: Partial<Driver>) => {
    setIsLoading(true);
    const payload: any = {};
    if (updates.name !== undefined) payload.name = updates.name;
    if (updates.phone !== undefined) payload.phone = updates.phone;
    if (updates.licenseNumber !== undefined) payload.license_number = updates.licenseNumber;
    if (updates.dateOfBirth !== undefined) payload.date_of_birth = updates.dateOfBirth || null;
    if (updates.address !== undefined) payload.address = updates.address;

    const { error } = await supabase.from('drivers').update(payload).eq('id', driverId);
    if (error) console.error('Failed to update driver:', error);
    await refreshDrivers();
  };

  const removeDriver = async (driverId: string) => {
    setIsLoading(true);
    const { error } = await supabase.from('drivers').delete().eq('id', driverId);
    if (error) console.error('Failed to remove driver:', error);
    await refreshDrivers();
  };

  const getDriversByUser = (userId: string) => {
    // With RLS, we only load current user's drivers
    return drivers;
  };

  const assignDriverToVehicle = async (driverId: string, vehicleId: string) => {
    if (!user) return;
    setIsLoading(true);

    // Deactivate any existing active assignment for this vehicle
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
    if (error) console.error('Failed to assign driver to vehicle:', error);

    await refreshDrivers();
  };

  const unassignDriverFromVehicle = async (driverId: string, vehicleId: string) => {
    setIsLoading(true);
    const { error } = await supabase
      .from('vehicle_assignments')
      .update({ is_active: false, unassigned_at: new Date().toISOString() })
      .eq('driver_id', driverId)
      .eq('vehicle_id', vehicleId)
      .eq('is_active', true);
    if (error) console.error('Failed to unassign driver from vehicle:', error);

    await refreshDrivers();
  };

  const getDriverById = (driverId: string) => {
    return drivers.find(driver => driver.id === driverId);
  };

  return (
    <DriverContext.Provider
      value={{
        drivers,
        addDriver,
        updateDriver,
        removeDriver,
        getDriversByUser,
        assignDriverToVehicle,
        unassignDriverFromVehicle,
        getDriverById,
        isLoading,
      }}
    >
      {children}
    </DriverContext.Provider>
  );
};