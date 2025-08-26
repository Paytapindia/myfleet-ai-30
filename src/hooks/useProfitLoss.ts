import { useMemo } from 'react';
import { Vehicle, PnLPeriod } from '@/types/vehicle';
import { useManualTransactions } from '@/contexts/ManualTransactionContext';

export const useProfitLoss = (vehicles: Vehicle[], period: PnLPeriod) => {
  const { manualTransactions } = useManualTransactions();
  return useMemo(() => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    
    let startDate: Date;
    
    switch (period) {
      case 'today':
        startDate = new Date(today);
        break;
      case 'weekly':
        startDate = new Date(today);
        startDate.setDate(today.getDate() - 7);
        break;
      case 'monthly':
        startDate = new Date(today);
        startDate.setMonth(today.getMonth() - 1);
        break;
      case 'yearly':
        startDate = new Date(today);
        startDate.setFullYear(today.getFullYear() - 1);
        break;
      default:
        startDate = new Date(today);
    }
    
    const startDateStr = startDate.toISOString().split('T')[0];
    
    let totalRevenue = 0;
    let totalExpenses = 0;
    
    vehicles.forEach(vehicle => {
      // Safety check: ensure financialData exists and is an array
      const financialData = vehicle.financialData || [];
      
      financialData.forEach(data => {
        if (period === 'today') {
          if (data.date === todayStr) {
            totalRevenue += data.revenue;
            totalExpenses += data.expenses;
          }
        } else {
          if (data.date >= startDateStr && data.date <= todayStr) {
            totalRevenue += data.revenue;
            totalExpenses += data.expenses;
          }
        }
      });
    });

    // Include manual transactions in the calculation with proper date formatting
    manualTransactions.forEach(transaction => {
      // Ensure consistent date format for comparison
      const transactionDate = new Date(transaction.date).toISOString().split('T')[0];
      
      console.log(`Comparing transaction date ${transactionDate} with period ${period}:`, {
        todayStr,
        startDateStr,
        transactionDate,
        amount: transaction.amount,
        category: transaction.category,
        description: transaction.description
      });
      
      if (period === 'today') {
        if (transactionDate === todayStr) {
          if (transaction.category === 'income') {
            totalRevenue += transaction.amount;
            console.log('Added income:', transaction.amount, 'New total revenue:', totalRevenue);
          } else {
            totalExpenses += transaction.amount;
            console.log('Added expense:', transaction.amount, 'New total expenses:', totalExpenses);
          }
        }
      } else {
        if (transactionDate >= startDateStr && transactionDate <= todayStr) {
          if (transaction.category === 'income') {
            totalRevenue += transaction.amount;
            console.log('Added income:', transaction.amount, 'New total revenue:', totalRevenue);
          } else {
            totalExpenses += transaction.amount;
            console.log('Added expense:', transaction.amount, 'New total expenses:', totalExpenses);
          }
        }
      }
    });
    
    const pnl = totalRevenue - totalExpenses;
    
    return {
      profit: totalRevenue,
      loss: totalExpenses,
      netPnL: pnl,
      isProfit: pnl >= 0
    };
  }, [vehicles, period, manualTransactions]);
};