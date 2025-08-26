import React, { createContext, useContext, useState, useEffect } from 'react';
import { Transaction } from '@/types/transaction';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';
import { toast } from 'sonner';

interface ManualTransactionContextType {
  manualTransactions: Transaction[];
  addManualTransaction: (transaction: Omit<Transaction, 'id'>) => Promise<void>;
  removeManualTransaction: (id: string) => Promise<void>;
  updateManualTransaction: (id: string, transaction: Partial<Transaction>) => Promise<void>;
  isLoading: boolean;
  refreshTransactions: () => Promise<void>;
}

const ManualTransactionContext = createContext<ManualTransactionContextType | undefined>(undefined);

export const useManualTransactions = () => {
  const context = useContext(ManualTransactionContext);
  if (!context) {
    throw new Error('useManualTransactions must be used within a ManualTransactionProvider');
  }
  return context;
};

export const ManualTransactionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [manualTransactions, setManualTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load transactions from Supabase on mount
  useEffect(() => {
    if (user) {
      refreshTransactions();
    }
  }, [user]);

  const refreshTransactions = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_manual', true)
        .order('transaction_date', { ascending: false });

      if (error) throw error;

      // Map Supabase data to Transaction type
      const transactions: Transaction[] = data?.map(t => ({
        id: t.id,
        vehicleId: t.vehicle_id || '',
        vehicleNumber: '', // Will be populated from vehicles table
        type: t.type,
        amount: Number(t.amount),
        description: t.description,
        date: t.transaction_date,
        location: t.location,
        reference: t.reference_number,
        category: t.category as 'income' | 'expense',
        paymentMethod: t.payment_method,
        isManual: t.is_manual
      })) || [];

      setManualTransactions(transactions);
    } catch (error) {
      console.error('Error loading transactions:', error);
      toast.error('Failed to load transactions');
    } finally {
      setIsLoading(false);
    }
  };

  const addManualTransaction = async (transaction: Omit<Transaction, 'id'>) => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('transactions')
        .insert({
          user_id: user.id,
          vehicle_id: transaction.vehicleId || null,
          type: transaction.type,
          category: transaction.category,
          amount: transaction.amount,
          description: transaction.description,
          reference_number: transaction.reference,
          location: transaction.location,
          payment_method: transaction.paymentMethod,
          transaction_date: transaction.date,
          is_manual: true
        })
        .select()
        .single();

      if (error) throw error;

      // Map and add to local state
      const newTransaction: Transaction = {
        id: data.id,
        vehicleId: data.vehicle_id || '',
        vehicleNumber: '', // Will be populated from vehicles table
        type: data.type,
        amount: Number(data.amount),
        description: data.description,
        date: data.transaction_date,
        location: data.location,
        reference: data.reference_number,
        category: data.category as 'income' | 'expense',
        paymentMethod: data.payment_method,
        isManual: data.is_manual
      };

      setManualTransactions(prev => [newTransaction, ...prev]);
      toast.success('Transaction added successfully');
    } catch (error) {
      console.error('Error adding transaction:', error);
      toast.error('Failed to add transaction');
      throw error;
    }
  };

  const removeManualTransaction = async (id: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;

      setManualTransactions(prev => prev.filter(t => t.id !== id));
      toast.success('Transaction deleted successfully');
    } catch (error) {
      console.error('Error deleting transaction:', error);
      toast.error('Failed to delete transaction');
      throw error;
    }
  };

  const updateManualTransaction = async (id: string, updates: Partial<Transaction>) => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('transactions')
        .update({
          vehicle_id: updates.vehicleId,
          type: updates.type,
          category: updates.category,
          amount: updates.amount,
          description: updates.description,
          reference_number: updates.reference,
          location: updates.location,
          payment_method: updates.paymentMethod,
          transaction_date: updates.date
        })
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;

      // Update local state
      setManualTransactions(prev => 
        prev.map(t => t.id === id ? {
          ...t,
          vehicleId: data.vehicle_id || '',
          type: data.type,
          amount: Number(data.amount),
          description: data.description,
          date: data.transaction_date,
          location: data.location,
          reference: data.reference_number,
          category: data.category as 'income' | 'expense',
          paymentMethod: data.payment_method
        } : t)
      );
      
      toast.success('Transaction updated successfully');
    } catch (error) {
      console.error('Error updating transaction:', error);
      toast.error('Failed to update transaction');
      throw error;
    }
  };

  return (
    <ManualTransactionContext.Provider value={{
      manualTransactions,
      addManualTransaction,
      removeManualTransaction,
      updateManualTransaction,
      isLoading,
      refreshTransactions
    }}>
      {children}
    </ManualTransactionContext.Provider>
  );
};