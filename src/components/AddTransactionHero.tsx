import { useState } from 'react';
import { Plus, TrendingUp, TrendingDown } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { SimpleTransactionModal } from '@/components/SimpleTransactionModal';

export const AddTransactionHero = () => {
  const [incomeModalOpen, setIncomeModalOpen] = useState(false);
  const [expenseModalOpen, setExpenseModalOpen] = useState(false);

  return (
    <>
      <Card className="mb-6 bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
        <CardContent className="p-6">
          <div className="text-center mb-6">
            <h2 className="text-xl font-semibold mb-2">Quick Add Transaction</h2>
            <p className="text-muted-foreground">
              Add income or expenses to track your fleet's financial performance
            </p>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <Button
              size="lg"
              onClick={() => setIncomeModalOpen(true)}
              className="h-16 text-base flex flex-col gap-2 bg-white hover:bg-green-50 text-green-600 border-2 border-green-600 hover:border-green-700"
            >
              <TrendingUp className="h-5 w-5" />
              Add Income
            </Button>
            
            <Button
              size="lg"
              onClick={() => setExpenseModalOpen(true)}
              className="h-16 text-base flex flex-col gap-2 bg-white hover:bg-red-50 text-red-600 border-2 border-red-600 hover:border-red-700"
            >
              <TrendingDown className="h-5 w-5" />
              Add Expense
            </Button>
          </div>
        </CardContent>
      </Card>

      <SimpleTransactionModal 
        type="income"
        isOpen={incomeModalOpen}
        onClose={() => setIncomeModalOpen(false)}
      />
      
      <SimpleTransactionModal 
        type="expense"
        isOpen={expenseModalOpen}
        onClose={() => setExpenseModalOpen(false)}
      />
    </>
  );
};