import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Trip, CreateTripFormData, TripFilters, TripAnalytics, TripStatus } from '@/types/trip';
import { useAuth } from './AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface TripContextType {
  trips: Trip[];
  analytics: TripAnalytics;
  isLoading: boolean;
  createTrip: (tripData: CreateTripFormData) => Promise<Trip>;
  updateTripStatus: (tripId: string, status: TripStatus) => Promise<void>;
  updateTrip: (tripId: string, updates: Partial<Trip>) => Promise<void>;
  deleteTrip: (tripId: string) => Promise<void>;
  getFilteredTrips: (filters: TripFilters) => Trip[];
  refreshAnalytics: () => void;
  refreshTrips: () => Promise<void>;
}

const TripContext = createContext<TripContextType | undefined>(undefined);

export const useTrips = () => {
  const context = useContext(TripContext);
  if (!context) {
    throw new Error('useTrips must be used within a TripProvider');
  }
  return context;
};

interface TripProviderProps {
  children: ReactNode;
}

export const TripProvider: React.FC<TripProviderProps> = ({ children }) => {
  const { user } = useAuth();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [analytics, setAnalytics] = useState<TripAnalytics>({
    totalTrips: 0,
    activeTrips: 0,
    completedToday: 0,
    todaysEarnings: 0,
    todaysProfit: 0,
    profitPercentage: 0,
    averageDistance: 0,
    averageDuration: 0,
    topDestinations: [],
    driverPerformance: []
  });
  const [isLoading, setIsLoading] = useState(true);

  // Load trips from Supabase on mount
  useEffect(() => {
    if (user) {
      refreshTrips();
    }
  }, [user]);

  // Recalculate analytics whenever trips change
  useEffect(() => {
    calculateAnalytics();
  }, [trips]);

  const refreshTrips = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('trips')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Map Supabase data to Trip type
      const tripsData: Trip[] = data?.map(t => ({
        id: t.id,
        tripNumber: t.id.slice(0, 8).toUpperCase(), // Generate trip number from ID
        status: t.status as TripStatus,
        type: 'local', // Default type, update schema if needed
        pickup: { address: t.pickup_location || '' },
        destination: { address: t.destination || '' },
        vehicleId: t.vehicle_id,
        vehicleNumber: '', // Will be populated from vehicles table
        driverId: t.driver_id || '',
        driverName: '', // Will be populated from drivers table
        passenger: {
          id: 'p1',
          name: t.customer_name || '',
          phone: t.customer_phone || ''
        },
        scheduledStartTime: t.scheduled_at || new Date().toISOString(),
        actualStartTime: t.started_at,
        actualEndTime: t.completed_at,
        distance: Number(t.distance_km) || 0,
        duration: 0, // Calculate if needed
        earnings: {
          totalFare: Number(t.total_fare) || 0,
          baseFare: Number(t.base_fare) || 0,
          extraCharges: Number(t.waiting_charges) || 0,
          tolls: Number(t.toll_charges) || 0,
          fuel: 0, // Calculate if needed
          driverPay: Number(t.driver_earnings) || 0,
          netProfit: Number(t.commission) || 0
        },
        notes: t.notes,
        createdAt: t.created_at,
        updatedAt: t.updated_at,
        userId: t.user_id
      })) || [];

      setTrips(tripsData);
    } catch (error) {
      console.error('Error loading trips:', error);
      toast.error('Failed to load trips');
    } finally {
      setIsLoading(false);
    }
  };

  const generateMockTrips = () => {
    const mockTrips: Trip[] = [
      {
        id: '1',
        tripNumber: 'TRP001',
        status: 'active',
        type: 'local',
        pickup: { address: 'Koramangala 5th Block, Bangalore' },
        destination: { address: 'Brigade Road, Bangalore' },
        vehicleId: 'v1',
        vehicleNumber: 'KA01AB1234',
        driverId: 'd1',
        driverName: 'Ravi Kumar',
        passenger: {
          id: 'p1',
          name: 'Anish Sharma',
          phone: '+91 98765 43210'
        },
        scheduledStartTime: new Date().toISOString(),
        actualStartTime: new Date().toISOString(),
        estimatedEndTime: new Date(Date.now() + 30 * 60000).toISOString(),
        distance: 12,
        duration: 25,
        earnings: {
          totalFare: 280,
          baseFare: 240,
          extraCharges: 40,
          tolls: 20,
          fuel: 60,
          driverPay: 140,
          netProfit: 60
        },
        eta: 25,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        userId: user?.id || ''
      },
      {
        id: '2',
        tripNumber: 'TRP002',
        status: 'completed',
        type: 'airport',
        pickup: { address: 'Whitefield, Bangalore' },
        destination: { address: 'Kempegowda International Airport, Bangalore' },
        vehicleId: 'v2',
        vehicleNumber: 'KA01CD5678',
        driverId: 'd2',
        driverName: 'Suresh Reddy',
        passenger: {
          id: 'p2',
          name: 'Priya Nair',
          phone: '+91 87654 32109'
        },
        scheduledStartTime: new Date(Date.now() - 2 * 60 * 60000).toISOString(),
        actualStartTime: new Date(Date.now() - 2 * 60 * 60000).toISOString(),
        actualEndTime: new Date(Date.now() - 1 * 60 * 60000).toISOString(),
        distance: 45,
        duration: 75,
        earnings: {
          totalFare: 850,
          baseFare: 750,
          extraCharges: 100,
          tolls: 80,
          fuel: 200,
          driverPay: 400,
          netProfit: 170
        },
        createdAt: new Date(Date.now() - 2 * 60 * 60000).toISOString(),
        updatedAt: new Date(Date.now() - 1 * 60 * 60000).toISOString(),
        userId: user?.id || ''
      }
    ];
    setTrips(mockTrips);
  };

  const calculateAnalytics = () => {
    const today = new Date().toDateString();
    const completedToday = trips.filter(trip => 
      trip.status === 'completed' && 
      new Date(trip.actualEndTime || trip.createdAt).toDateString() === today
    );
    
    const activeTrips = trips.filter(trip => trip.status === 'active');
    
    const todaysEarnings = completedToday.reduce((sum, trip) => sum + trip.earnings.totalFare, 0);
    const todaysProfit = completedToday.reduce((sum, trip) => sum + trip.earnings.netProfit, 0);
    const profitPercentage = todaysEarnings > 0 ? (todaysProfit / todaysEarnings) * 100 : 0;
    
    const completedTrips = trips.filter(trip => trip.status === 'completed');
    const averageDistance = completedTrips.length > 0 
      ? completedTrips.reduce((sum, trip) => sum + (trip.distance || 0), 0) / completedTrips.length 
      : 0;
    
    const averageDuration = completedTrips.length > 0
      ? completedTrips.reduce((sum, trip) => sum + (trip.duration || 0), 0) / completedTrips.length
      : 0;

    const destinationMap = new Map<string, { count: number; earnings: number }>();
    completedTrips.forEach(trip => {
      const dest = trip.destination.address;
      const existing = destinationMap.get(dest) || { count: 0, earnings: 0 };
      destinationMap.set(dest, {
        count: existing.count + 1,
        earnings: existing.earnings + trip.earnings.netProfit
      });
    });

    const topDestinations = Array.from(destinationMap.entries())
      .map(([destination, data]) => ({ destination, ...data }))
      .sort((a, b) => b.earnings - a.earnings)
      .slice(0, 5);

    const driverMap = new Map<string, { trips: number; earnings: number }>();
    completedTrips.forEach(trip => {
      const driver = trip.driverId;
      const existing = driverMap.get(driver) || { trips: 0, earnings: 0 };
      driverMap.set(driver, {
        trips: existing.trips + 1,
        earnings: existing.earnings + trip.earnings.netProfit
      });
    });

    const driverPerformance = Array.from(driverMap.entries())
      .map(([driverId, data]) => {
        const trip = trips.find(t => t.driverId === driverId);
        return {
          driverId,
          driverName: trip?.driverName || 'Unknown',
          ...data
        };
      })
      .sort((a, b) => b.earnings - a.earnings);

    setAnalytics({
      totalTrips: trips.length,
      activeTrips: activeTrips.length,
      completedToday: completedToday.length,
      todaysEarnings,
      todaysProfit,
      profitPercentage,
      averageDistance,
      averageDuration,
      topDestinations,
      driverPerformance
    });
  };

  const createTrip = async (tripData: CreateTripFormData): Promise<Trip> => {
    if (!user) throw new Error('User not authenticated');

    try {
      const { data, error } = await supabase
        .from('trips')
        .insert({
          user_id: user.id,
          vehicle_id: '', // Will need to be assigned
          pickup_location: tripData.pickup.address,
          destination: tripData.destination.address,
          customer_name: tripData.passenger.name,
          customer_phone: tripData.passenger.phone,
          base_fare: tripData.baseFare,
          scheduled_at: tripData.scheduledStartTime,
          notes: tripData.notes,
          status: 'scheduled'
        })
        .select()
        .single();

      if (error) throw error;

      const newTrip: Trip = {
        id: data.id,
        tripNumber: data.id.slice(0, 8).toUpperCase(),
        status: data.status as TripStatus,
        type: tripData.type,
        pickup: tripData.pickup,
        destination: tripData.destination,
        vehicleId: data.vehicle_id,
        vehicleNumber: '',
        driverId: '',
        driverName: '',
        passenger: tripData.passenger,
        scheduledStartTime: data.scheduled_at,
        distance: 0,
        duration: 0,
        earnings: {
          totalFare: Number(data.base_fare),
          baseFare: Number(data.base_fare),
          extraCharges: 0,
          tolls: 0,
          fuel: 0,
          driverPay: 0,
          netProfit: 0
        },
        notes: data.notes,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
        userId: data.user_id
      };

      setTrips(prev => [newTrip, ...prev]);
      toast.success('Trip created successfully');
      return newTrip;
    } catch (error) {
      console.error('Error creating trip:', error);
      toast.error('Failed to create trip');
      throw error;
    }
  };

  const updateTripStatus = async (tripId: string, status: TripStatus) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('trips')
        .update({ 
          status: status as any,
          ...(status === 'active' && { started_at: new Date().toISOString() }),
          ...(status === 'completed' && { completed_at: new Date().toISOString() })
        })
        .eq('id', tripId)
        .eq('user_id', user.id);

      if (error) throw error;

      setTrips(prev => prev.map(trip => 
        trip.id === tripId 
          ? { 
              ...trip, 
              status, 
              updatedAt: new Date().toISOString(),
              ...(status === 'active' && { actualStartTime: new Date().toISOString() }),
              ...(status === 'completed' && { actualEndTime: new Date().toISOString() })
            }
          : trip
      ));
      
      toast.success('Trip status updated successfully');
    } catch (error) {
      console.error('Error updating trip status:', error);
      toast.error('Failed to update trip status');
      throw error;
    }
  };

  const updateTrip = async (tripId: string, updates: Partial<Trip>) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('trips')
        .update({
          pickup_location: updates.pickup?.address,
          destination: updates.destination?.address,
          customer_name: updates.passenger?.name,
          customer_phone: updates.passenger?.phone,
          base_fare: updates.earnings?.baseFare,
          notes: updates.notes
        })
        .eq('id', tripId)
        .eq('user_id', user.id);

      if (error) throw error;

      setTrips(prev => prev.map(trip => 
        trip.id === tripId 
          ? { ...trip, ...updates, updatedAt: new Date().toISOString() }
          : trip
      ));
      
      toast.success('Trip updated successfully');
    } catch (error) {
      console.error('Error updating trip:', error);
      toast.error('Failed to update trip');
      throw error;
    }
  };

  const deleteTrip = async (tripId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('trips')
        .delete()
        .eq('id', tripId)
        .eq('user_id', user.id);

      if (error) throw error;

      setTrips(prev => prev.filter(trip => trip.id !== tripId));
      toast.success('Trip deleted successfully');
    } catch (error) {
      console.error('Error deleting trip:', error);
      toast.error('Failed to delete trip');
      throw error;
    }
  };

  const getFilteredTrips = (filters: TripFilters): Trip[] => {
    return trips.filter(trip => {
      if (filters.status && !filters.status.includes(trip.status)) return false;
      if (filters.type && !filters.type.includes(trip.type)) return false;
      if (filters.vehicleId && trip.vehicleId !== filters.vehicleId) return false;
      if (filters.driverId && trip.driverId !== filters.driverId) return false;
      if (filters.corporateAccountId && trip.corporateAccountId !== filters.corporateAccountId) return false;
      
      if (filters.dateRange) {
        const tripDate = new Date(trip.createdAt);
        const startDate = new Date(filters.dateRange.start);
        const endDate = new Date(filters.dateRange.end);
        if (tripDate < startDate || tripDate > endDate) return false;
      }
      
      return true;
    });
  };

  const refreshAnalytics = () => {
    calculateAnalytics();
  };

  return (
    <TripContext.Provider
      value={{
        trips,
        analytics,
        isLoading,
        createTrip,
        updateTripStatus,
        updateTrip,
        deleteTrip,
        getFilteredTrips,
        refreshAnalytics,
        refreshTrips
      }}
    >
      {children}
    </TripContext.Provider>
  );
};