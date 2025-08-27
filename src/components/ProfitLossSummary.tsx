import { TrendingUp, TrendingDown, DollarSign, PieChart } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ProfitLossData } from '@/types/transaction';

interface ProfitLossSummaryProps {
  data: ProfitLossData;
}

export const ProfitLossSummary = ({ data }: ProfitLossSummaryProps) => {
  const { totalRevenue, totalExpenses, netProfitLoss } = data;
  const isProfit = netProfitLoss >= 0;
  const profitMargin = totalRevenue > 0 ? ((netProfitLoss / totalRevenue) * 100) : 0;
  
  const topExpenseCategories = Object.entries(data.expenseBreakdown)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 3);
  
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
      {/* Total Revenue */}
      <Card className="shadow-sm hover:shadow-md transition-all duration-200">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
          <CardTitle className="text-xs sm:text-sm font-medium">Total Revenue</CardTitle>
          <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-status-active" />
        </CardHeader>
        <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
          <div className="text-lg sm:text-2xl font-bold text-status-active">₹{totalRevenue.toLocaleString()}</div>
          <p className="text-xs text-muted-foreground">Total income earned</p>
        </CardContent>
      </Card>
      
      {/* Total Expenses */}
      <Card className="shadow-sm hover:shadow-md transition-all duration-200">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
          <CardTitle className="text-xs sm:text-sm font-medium">Total Expenses</CardTitle>
          <TrendingDown className="h-3 w-3 sm:h-4 sm:w-4 text-status-urgent" />
        </CardHeader>
        <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
          <div className="text-lg sm:text-2xl font-bold text-status-urgent">₹{totalExpenses.toLocaleString()}</div>
          <p className="text-xs text-muted-foreground">Total operational costs</p>
        </CardContent>
      </Card>
      
      {/* Net Profit/Loss */}
      <Card className="shadow-sm hover:shadow-md transition-all duration-200">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
          <CardTitle className="text-xs sm:text-sm font-medium">Net {isProfit ? 'Profit' : 'Loss'}</CardTitle>
          {isProfit ? (
            <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-status-active" />
          ) : (
            <TrendingDown className="h-3 w-3 sm:h-4 sm:w-4 text-status-urgent" />
          )}
        </CardHeader>
        <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
          <div className={`text-lg sm:text-2xl font-bold ${isProfit ? 'text-status-active' : 'text-status-urgent'}`}>
            ₹{Math.abs(netProfitLoss).toLocaleString()}
          </div>
          <p className="text-xs text-muted-foreground">
            {profitMargin.toFixed(1)}% profit margin
          </p>
        </CardContent>
      </Card>
      
      {/* Top Expense Category */}
      <Card className="shadow-sm hover:shadow-md transition-all duration-200">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
          <CardTitle className="text-xs sm:text-sm font-medium">Top Expense</CardTitle>
          <PieChart className="h-3 w-3 sm:h-4 sm:w-4 text-primary" />
        </CardHeader>
        <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
          {topExpenseCategories.length > 0 ? (
            <>
              <div className="text-lg sm:text-2xl font-bold">₹{topExpenseCategories[0][1].toLocaleString()}</div>
              <p className="text-xs text-muted-foreground capitalize">
                {topExpenseCategories[0][0].replace('_', ' ')}
              </p>
            </>
          ) : (
            <>
              <div className="text-lg sm:text-2xl font-bold">₹0</div>
              <p className="text-xs text-muted-foreground">No expenses</p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};