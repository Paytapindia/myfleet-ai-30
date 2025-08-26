import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';
import { toast } from 'sonner';

export interface WalletTransaction {
  id: string;
  vehicleId: string;
  tripId?: string;
  type: 'credit' | 'debit' | 'refund' | 'commission' | 'settlement';
  amount: number;
  balanceAfter: number;
  description: string;
  referenceNumber?: string;
  createdAt: string;
}

interface WalletContextType {
  walletTransactions: WalletTransaction[];
  isLoading: boolean;
  createWalletTransaction: (transaction: Omit<WalletTransaction, 'id' | 'balanceAfter' | 'createdAt'>) => Promise<void>;
  getVehicleBalance: (vehicleId: string) => Promise<number>;
  refreshWalletTransactions: () => Promise<void>;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export const useWallet = () => {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
};

export const WalletProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [walletTransactions, setWalletTransactions] = useState<WalletTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      refreshWalletTransactions();
    }
  }, [user]);

  const refreshWalletTransactions = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('wallet_transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const transactions: WalletTransaction[] = data?.map(t => ({
        id: t.id,
        vehicleId: t.vehicle_id,
        tripId: t.trip_id,
        type: t.type as WalletTransaction['type'],
        amount: Number(t.amount),
        balanceAfter: Number(t.balance_after),
        description: t.description,
        referenceNumber: t.reference_number,
        createdAt: t.created_at
      })) || [];

      setWalletTransactions(transactions);
    } catch (error) {
      console.error('Error loading wallet transactions:', error);
      toast.error('Failed to load wallet transactions');
    } finally {
      setIsLoading(false);
    }
  };

  const createWalletTransaction = async (transaction: Omit<WalletTransaction, 'id' | 'balanceAfter' | 'createdAt'>) => {
    if (!user) return;

    try {
      // Get current balance for the vehicle
      const currentBalance = await getVehicleBalance(transaction.vehicleId);
      
      // Calculate new balance
      const balanceChange = transaction.type === 'credit' ? transaction.amount : -transaction.amount;
      const newBalance = currentBalance + balanceChange;

      if (newBalance < 0 && transaction.type === 'debit') {
        throw new Error('Insufficient wallet balance');
      }

      const { data, error } = await supabase
        .from('wallet_transactions')
        .insert({
          user_id: user.id,
          vehicle_id: transaction.vehicleId,
          trip_id: transaction.tripId,
          type: transaction.type,
          amount: transaction.amount,
          balance_after: newBalance,
          description: transaction.description,
          reference_number: transaction.referenceNumber
        })
        .select()
        .single();

      if (error) throw error;

      const newTransaction: WalletTransaction = {
        id: data.id,
        vehicleId: data.vehicle_id,
        tripId: data.trip_id,
        type: data.type as WalletTransaction['type'],
        amount: Number(data.amount),
        balanceAfter: Number(data.balance_after),
        description: data.description,
        referenceNumber: data.reference_number,
        createdAt: data.created_at
      };

      setWalletTransactions(prev => [newTransaction, ...prev]);
      toast.success(`Wallet ${transaction.type} processed successfully`);
    } catch (error: any) {
      console.error('Error creating wallet transaction:', error);
      toast.error(error.message || 'Failed to process wallet transaction');
      throw error;
    }
  };

  const getVehicleBalance = async (vehicleId: string): Promise<number> => {
    if (!user) return 0;

    try {
      const { data, error } = await supabase
        .from('vehicles')
        .select('wallet_balance')
        .eq('id', vehicleId)
        .eq('user_id', user.id)
        .single();

      if (error) throw error;
      return Number(data?.wallet_balance) || 0;
    } catch (error) {
      console.error('Error fetching vehicle balance:', error);
      return 0;
    }
  };

  return (
    <WalletContext.Provider value={{
      walletTransactions,
      isLoading,
      createWalletTransaction,
      getVehicleBalance,
      refreshWalletTransactions
    }}>
      {children}
    </WalletContext.Provider>
  );
};